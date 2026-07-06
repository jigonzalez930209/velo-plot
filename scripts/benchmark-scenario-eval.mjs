/**
 * Shared headless/desktop FPS evaluation for browser benchmarks.
 */

/** When wall-clock frame count is below this, headless rAF is unreliable — use renderFps. */
export const HEADLESS_LOW_FRAME_THRESHOLD = 30;

/** Headless smoke floors (renderFps or effective FPS). Desktop uses baseline minAvgFps. */
export const SMOKE_FLOORS = {
  "line-1m-pan": 5,
  "candlestick-500k": 25,
  "stack-5pane-resize": 20,
  "line-200k-webgl": 3,
  "line-200k-webgpu": 2,
  "boxplot-5k-webgpu": 2,
};

/**
 * @param {{ avgFps?: number; renderFps?: number; frameCount?: number }} result
 * @param {boolean} isHeadless
 */
export function effectiveBenchmarkFps(result, isHeadless) {
  const wall = result.avgFps ?? 0;
  const render = result.renderFps ?? 0;
  const frames = result.frameCount ?? 0;

  if (!isHeadless) return wall;

  if (render > 0 && (frames < HEADLESS_LOW_FRAME_THRESHOLD || wall < 10)) {
    return render;
  }
  return wall;
}

/**
 * @param {{ id: string; result?: { avgFps?: number; renderFps?: number; frameCount?: number; avgFrameTime?: number }; skipped?: boolean }} scenario
 * @param {{ minAvgFps?: number }} spec
 * @param {{ isHeadless: boolean; threshold: number }} opts
 */
export function evaluateScenario(scenario, spec, { isHeadless, threshold }) {
  const smokeFloor = SMOKE_FLOORS[scenario.id] ?? 5;
  const targetFps = isHeadless ? smokeFloor : (spec.minAvgFps ?? smokeFloor);
  const minAllowed = targetFps * (1 - threshold);
  const wall = scenario.result?.avgFps ?? 0;
  const render = scenario.result?.renderFps;
  const effective = effectiveBenchmarkFps(scenario.result ?? {}, isHeadless);
  const ok = effective >= minAllowed;

  const usesRenderMetric =
    isHeadless &&
    render != null &&
    effective === render &&
    (wall < 10 || (scenario.result?.frameCount ?? 0) < HEADLESS_LOW_FRAME_THRESHOLD);

  return { ok, effective, wall, render, minAllowed, targetFps, usesRenderMetric };
}
