#!/usr/bin/env node
/**
 * Compare browser benchmark results against a baseline or previous CI artifact.
 * Fails when any scenario regresses more than the configured threshold (default 20%).
 *
 * Usage:
 *   node scripts/compare-benchmark-regression.mjs [current.json] [previous.json]
 *
 * If previous.json is omitted, compares against src/testing/baselines/v1.15.0.json targets.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { effectiveBenchmarkFps, SMOKE_FLOORS } from "./benchmark-scenario-eval.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const currentPath = process.argv[2] ?? join(root, "browser-benchmark-results.json");
const previousPath = process.argv[3] ?? null;
const regressionThreshold = Number(process.env.BENCHMARK_REGRESSION_THRESHOLD ?? 0.2);
const headlessMode = process.env.BENCHMARK_HEADLESS === "1";

if (!existsSync(currentPath)) {
  console.error(`[benchmark-regression] Missing current results: ${currentPath}`);
  process.exit(1);
}

const current = JSON.parse(readFileSync(currentPath, "utf8"));
const baseline = JSON.parse(
  readFileSync(join(root, "src/testing/baselines/v1.15.0.json"), "utf8"),
);
const previous = previousPath && existsSync(previousPath)
  ? JSON.parse(readFileSync(previousPath, "utf8"))
  : null;

const failures = [];

function scenarioFps(report, id) {
  return report.scenarios?.find((s) => s.id === id)?.result?.avgFps ?? null;
}

for (const scenario of current.scenarios ?? []) {
  const id = scenario.id;
  const wall = scenario.result?.avgFps ?? 0;
  const fps = headlessMode
    ? effectiveBenchmarkFps(scenario.result ?? {}, true)
    : wall;
  const spec = baseline.scenarios[id];

  if (spec?.minAvgFps != null && !headlessMode && !scenario.skipped) {
    const floor = spec.minAvgFps * (1 - (baseline.regressionThreshold ?? 0.1));
    if (fps < floor) {
      failures.push(
        `${id}: ${fps.toFixed(1)} FPS below baseline floor ${floor.toFixed(1)} (target ${spec.minAvgFps})`,
      );
    }
  }

  if (spec?.minAvgFps != null && headlessMode && !scenario.skipped) {
    const smoke = SMOKE_FLOORS[id] ?? 5;
    const floor = smoke * (1 - (baseline.regressionThreshold ?? 0.1));
    if (fps < floor) {
      failures.push(
        `${id}: ${fps.toFixed(1)} effective FPS below headless floor ${floor.toFixed(1)} (wall ${wall.toFixed(1)})`,
      );
    }
  }

  if (previous) {
    const prevFps = scenarioFps(previous, id);
    if (prevFps != null && prevFps > 0) {
      const minAllowed = prevFps * (1 - regressionThreshold);
      if (fps < minAllowed) {
        failures.push(
          `${id}: ${fps.toFixed(1)} FPS regressed >${(regressionThreshold * 100).toFixed(0)}% vs previous ${prevFps.toFixed(1)}`,
        );
      }
    }
  }

  console.log(`  ${id}: ${fps.toFixed(1)} FPS${headlessMode && fps !== wall ? ` (wall ${wall.toFixed(1)})` : ""}`);
}

if (failures.length > 0) {
  console.error("[benchmark-regression] FAILURES:");
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}

console.log("[benchmark-regression] No regressions detected.");
