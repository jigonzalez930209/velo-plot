#!/usr/bin/env node
/**
 * Run Stage 1 browser benchmarks in headless Chromium (Playwright).
 * Starts a local static server for dist/ + docs/public/.
 *
 * Usage: node scripts/browser-benchmark.mjs [port]
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync, createReadStream } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "docs/public");
const distDir = join(root, "dist");

const baseline = JSON.parse(
  readFileSync(join(root, "src/testing/baselines/v1.15.0.json"), "utf8"),
);

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".map": "application/json",
};

function resolveFile(urlPath) {
  if (urlPath === "/" || urlPath === "") {
    return join(publicDir, "demos/stage1-benchmark.html");
  }
  if (urlPath.startsWith("/dist/")) {
    const file = join(distDir, urlPath.slice("/dist/".length));
    return existsSync(file) ? file : null;
  }
  const publicFile = join(publicDir, urlPath.replace(/^\//, ""));
  if (existsSync(publicFile)) return publicFile;
  return null;
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url ?? "/", `http://127.0.0.1:${port}`).pathname);
      const file = resolveFile(urlPath);
      if (!file) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = extname(file);
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      createReadStream(file).pipe(res);
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

import {
  evaluateScenario,
} from "./benchmark-scenario-eval.mjs";

const port = Number(process.argv[2] ?? 9876);
const threshold = baseline.regressionThreshold ?? 0.1;
const failures = [];

if (!existsSync(join(distDir, "velo-plot.full.js"))) {
  console.error("[stage1-browser] dist/velo-plot.full.js missing — run pnpm build first");
  process.exit(1);
}

console.log(`[stage1-browser] Starting static server on :${port}`);
const server = await startServer(port);
const url = `http://127.0.0.1:${port}/demos/stage1-benchmark.html`;
console.log(`[stage1-browser] Loading ${url}`);

const headed = process.env.HEADED === "1";
if (headed) {
  console.log("[stage1-browser] Headed mode — using desktop baseline targets");
}

const browser = await chromium.launch({ headless: !headed });

try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForFunction(() => window.__STAGE1_BENCHMARK__?.done === true, null, {
    timeout: 300_000,
  });

  const report = await page.evaluate(() => window.__STAGE1_BENCHMARK__);

  const isHeadless = !headed && (await page.evaluate(() => navigator.webdriver === true));
  if (isHeadless) {
    console.log("  (headless mode — effective FPS uses render throughput when wall clock is throttled)");
  }

  for (const scenario of report.scenarios ?? []) {
    const spec = baseline.scenarios[scenario.id];
    if (!spec?.minAvgFps) continue;
    if (scenario.skipped) {
      console.log(`  ${scenario.id}: skipped (WebGPU unavailable in this environment)`);
      continue;
    }

    const { ok, effective, wall, render, minAllowed, usesRenderMetric } = evaluateScenario(
      scenario,
      spec,
      { isHeadless, threshold },
    );

    const metricLabel = usesRenderMetric ? "effective (render)" : "wall";
    const renderNote =
      render != null && render !== wall
        ? `, render-only ${render.toFixed(0)} FPS`
        : "";

    console.log(
      `  ${scenario.id}: ${effective.toFixed(1)} FPS ${metricLabel} (${scenario.result?.frameCount ?? 0} frames, render ${scenario.result?.avgFrameTime ?? 0}ms${renderNote}) — ${ok ? "PASS" : "FAIL"}`,
    );

    if (!ok) {
      failures.push(
        `${scenario.id}: ${effective.toFixed(1)} FPS < ${minAllowed.toFixed(1)} (${metricLabel})`,
      );
    }
  }

  if (report.grid) {
    console.log(
      `  grid-spike: WebGL ${report.grid.gainPercent}% faster → ${report.grid.recommendation}`,
    );
    console.log(
      `    canvas2d ${report.grid.canvas2d?.avgFrameUs}µs | webgl ${report.grid.webgl?.avgFrameUs ?? "n/a"}µs`,
    );
  }

  if (report.rendererCompare) {
    const rc = report.rendererCompare;
    const minRatio = baseline.webgpuMinFpsRatio ?? 0.95;
    const ok =
      !rc.webgpuActive ||
      isHeadless ||
      rc.fpsRatio >= minRatio * (1 - threshold);
    console.log(
      `  renderer-compare: WebGL ${rc.webgl?.avgFps?.toFixed(1) ?? "?"} vs WebGPU ${rc.webgpu?.avgFps?.toFixed(1) ?? "n/a"} FPS — ratio ${((rc.fpsRatio ?? 0) * 100).toFixed(0)}% → ${rc.recommendation} ${ok ? "PASS" : "FAIL"}`,
    );
    if (!ok && rc.webgpuActive) {
      failures.push(
        `renderer-compare: WebGPU ratio ${(rc.fpsRatio * 100).toFixed(0)}% < ${(minRatio * 100).toFixed(0)}% target`,
      );
    }
  }

  const outPath = join(root, "browser-benchmark-results.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`[stage1-browser] Results written to ${outPath}`);

  if (report.error) {
    failures.push(`page error: ${report.error}`);
  }

  if (failures.length > 0) {
    console.error("[stage1-browser] FAILURES:");
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exitCode = 1;
  } else {
    console.log("[stage1-browser] All scenarios passed.");
  }

  if (process.exitCode !== 1) {
    const { spawnSync } = await import("node:child_process");
    const compare = spawnSync(
      process.execPath,
      [join(root, "scripts/compare-benchmark-regression.mjs"), outPath],
      {
        stdio: "inherit",
        env: { ...process.env, BENCHMARK_HEADLESS: isHeadless ? "1" : "0" },
      },
    );
    if (compare.status !== 0) process.exitCode = 1;
  }
} catch (err) {
  console.error("[stage1-browser] Error:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
