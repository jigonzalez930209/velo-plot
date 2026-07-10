#!/usr/bin/env node
/**
 * Measure minified + gzip size of bundle entry points (post-build).
 * Fails CI when trading bundle exceeds the agreed budget.
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dist = resolve(root, "dist");

/** Minified ESM gzip budgets — see docs/guide/bundle-architecture.md */
const BUDGETS = {
  trading: 150 * 1024,
  core: 52 * 1024,
  scientific: 200 * 1024,
};

const ENTRIES = {
  trading: resolve(dist, "trading.js"),
  core: resolve(dist, "velo-plot.js"),
  scientific: resolve(dist, "scientific.js"),
};

async function measureBundle(entryPath, label) {
  const result = await build({
    entryPoints: [entryPath],
    bundle: true,
    minify: true,
    write: false,
    format: "esm",
    platform: "browser",
    logLevel: "silent",
  });
  const bytes = Buffer.from(result.outputFiles[0].contents);
  const gzipBytes = gzipSync(bytes).length;
  return { label, raw: bytes.length, gzip: gzipBytes };
}

function formatKb(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

async function main() {
  const missing = Object.values(ENTRIES).filter((p) => !existsSync(p));
  if (missing.length) {
    console.error("[bundle-size] dist/ missing — run pnpm build first");
    console.error(missing.map((p) => `  - ${p}`).join("\n"));
    process.exit(1);
  }

  const results = [];
  for (const [key, path] of Object.entries(ENTRIES)) {
    results.push({ key, ...(await measureBundle(path, key)) });
  }

  const report = {
    measuredAt: new Date().toISOString(),
    budgets: Object.fromEntries(
      Object.entries(BUDGETS).map(([k, v]) => [k, { gzipMaxBytes: v, gzipMaxLabel: formatKb(v) }]),
    ),
    bundles: Object.fromEntries(
      results.map((r) => [
        r.key,
        {
          rawBytes: r.raw,
          gzipBytes: r.gzip,
          rawLabel: formatKb(r.raw),
          gzipLabel: formatKb(r.gzip),
          budgetBytes: BUDGETS[r.key],
          withinBudget: r.gzip <= BUDGETS[r.key],
        },
      ]),
    ),
  };

  const outPath = resolve(root, "bundle-size-report.json");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("[bundle-size] Results (minified ESM, typical import):");
  const failures = [];
  for (const r of results) {
    const budget = BUDGETS[r.key];
    const ok = r.gzip <= budget;
    console.log(
      `  ${r.key}: ${formatKb(r.gzip)} gzip / ${formatKb(r.raw)} raw — ${ok ? "PASS" : "FAIL"} (budget ${formatKb(budget)})`,
    );
    if (!ok) failures.push(`${r.key}: ${formatKb(r.gzip)} > ${formatKb(budget)}`);
  }
  console.log(`[bundle-size] Report written to ${outPath}`);

  if (failures.length) {
    console.error("[bundle-size] Budget exceeded:");
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[bundle-size] Error:", err);
  process.exit(1);
});
