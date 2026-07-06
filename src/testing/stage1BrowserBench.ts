/**
 * Stage 1 browser benchmark harness — scenarios + baseline comparison.
 * @module testing/stage1BrowserBench
 */

import type { BenchmarkResult } from "./index";
import baseline from "./baselines/v1.15.0.json";

export interface Stage1ScenarioResult {
  id: string;
  benchmark: BenchmarkResult;
  passed: boolean;
  failures: string[];
  baselineMinFps?: number;
}

export interface Stage1BrowserReport {
  timestamp: number;
  version: string;
  scenarios: Stage1ScenarioResult[];
  allPassed: boolean;
  regressionThreshold: number;
}

export interface BaselineScenario {
  minAvgFps?: number;
  maxAvgFrameTimeMs?: number;
  maxAvgFrameUs?: number;
  dpr?: number;
  points?: number;
  description?: string;
}

/** When wall-clock frame count is below this, headless rAF is unreliable — use renderFps. */
export const HEADLESS_LOW_FRAME_THRESHOLD = 30;

/** Headless smoke floors (renderFps or effective FPS). Desktop uses baseline minAvgFps. */
export const SMOKE_FLOORS: Record<string, number> = {
  "line-1m-pan": 5,
  "candlestick-500k": 25,
  "stack-5pane-resize": 20,
  "line-200k-webgl": 3,
  "line-200k-webgpu": 2,
  "boxplot-5k-webgpu": 2,
};

/** Pick wall or render FPS depending on headless throttling artifacts. */
export function effectiveBenchmarkFps(
  result: Pick<BenchmarkResult, "avgFps" | "renderFps" | "frameCount">,
  isHeadless: boolean,
): number {
  const wall = result.avgFps ?? 0;
  const render = result.renderFps ?? 0;
  const frames = result.frameCount ?? 0;

  if (!isHeadless) return wall;

  if (render > 0 && (frames < HEADLESS_LOW_FRAME_THRESHOLD || wall < 10)) {
    return render;
  }
  return wall;
}

export function getBaseline(): typeof baseline {
  return baseline;
}

/** Compare a benchmark result against v1.15 baseline for a scenario */
export function compareScenarioToBaseline(
  scenarioId: string,
  result: BenchmarkResult | { avgFrameUs: number; backend?: string },
): { passed: boolean; failures: string[] } {
  const spec = (baseline.scenarios as Record<string, BaselineScenario>)[scenarioId];
  if (!spec) {
    return { passed: true, failures: [] };
  }

  const failures: string[] = [];
  const threshold = baseline.regressionThreshold ?? 0.1;

  if ("avgFps" in result && spec.minAvgFps !== undefined) {
    const minAllowed = spec.minAvgFps * (1 - threshold);
    if (result.avgFps < minAllowed) {
      failures.push(
        `FPS ${result.avgFps} < baseline min ${spec.minAvgFps} (allowed ${minAllowed.toFixed(1)} with ${threshold * 100}% slack)`,
      );
    }
  }

  if ("avgFrameTime" in result && spec.maxAvgFrameTimeMs !== undefined) {
    const maxAllowed = spec.maxAvgFrameTimeMs * (1 + threshold);
    if (result.avgFrameTime > maxAllowed) {
      failures.push(
        `Frame time ${result.avgFrameTime}ms > baseline max ${spec.maxAvgFrameTimeMs}ms`,
      );
    }
  }

  if ("avgFrameUs" in result && spec.maxAvgFrameUs !== undefined) {
    const maxAllowed = spec.maxAvgFrameUs * (1 + threshold);
    if (result.avgFrameUs > maxAllowed) {
      failures.push(
        `Grid frame ${result.avgFrameUs}µs > baseline max ${spec.maxAvgFrameUs}µs`,
      );
    }
  }

  return { passed: failures.length === 0, failures };
}

/** Build a full Stage 1 report from scenario results */
export function buildStage1Report(
  scenarios: Stage1ScenarioResult[],
): Stage1BrowserReport {
  return {
    timestamp: Date.now(),
    version: baseline.version,
    scenarios,
    allPassed: scenarios.every((s) => s.passed),
    regressionThreshold: baseline.regressionThreshold,
  };
}
