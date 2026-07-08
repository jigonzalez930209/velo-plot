/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  benchmarkCanvasGrid,
  compareGridBackends,
  countGridVertices,
} from "./gridSpikeBenchmark";
import { compareScenarioToBaseline, getBaseline, effectiveBenchmarkFps, HEADLESS_LOW_FRAME_THRESHOLD, SMOKE_FLOORS } from "./stage1BrowserBench";
import { evaluateRendererCompare } from "./rendererBenchmark";

describe("gridSpikeBenchmark (DOM)", () => {
  beforeEach(() => {
    vi.stubGlobal("performance", {
      now: (() => {
        let t = 0;
        return () => {
          t += 0.5;
          return t;
        };
      })(),
    });
  });

  it("builds grid vertex pairs", () => {
    expect(countGridVertices(24, 16)).toBe((24 + 16) * 2);
  });

  it("benchmarks Canvas 2D grid without throwing", () => {
    const result = benchmarkCanvasGrid({ width: 800, height: 600, dpr: 1, frames: 10 });
    expect(result.backend).toBe("canvas2d");
    expect(result.avgFrameUs).toBeGreaterThan(0);
    expect(result.lineSegments).toBeGreaterThan(0);
  });

  it("compareGridBackends returns canvas2d result", () => {
    const result = compareGridBackends({ dpr: 1, frames: 8 });
    expect(result.canvas2d.backend).toBe("canvas2d");
    expect(["implement", "defer"]).toContain(result.recommendation);
  });
});

describe("stage1BrowserBench baseline", () => {
  it("loads v1.15 baseline", () => {
    const b = getBaseline();
    expect(b.version).toBe("1.17.0");
    expect(b.scenarios["line-1m-pan"].minAvgFps).toBe(50);
  });

  it("passes when FPS meets baseline", () => {
    const check = compareScenarioToBaseline("line-1m-pan", {
      avgFps: 55,
      minFps: 50,
      maxFps: 60,
      avgFrameTime: 18,
      frameCount: 100,
      duration: 3000,
      pointsRendered: 1e6,
      throughput: 55e6,
    });
    expect(check.passed).toBe(true);
  });

  it("fails when FPS regresses beyond threshold", () => {
    const check = compareScenarioToBaseline("line-1m-pan", {
      avgFps: 40,
      minFps: 35,
      maxFps: 45,
      avgFrameTime: 25,
      frameCount: 100,
      duration: 3000,
      pointsRendered: 1e6,
      throughput: 40e6,
    });
    expect(check.passed).toBe(false);
    expect(check.failures.length).toBeGreaterThan(0);
  });

  it("validates grid canvas baseline in microseconds", () => {
    const check = compareScenarioToBaseline("grid-canvas2d-dpr2", { avgFrameUs: 900 });
    expect(check.passed).toBe(true);

    const fail = compareScenarioToBaseline("grid-canvas2d-dpr2", { avgFrameUs: 2000 });
    expect(fail.passed).toBe(false);
  });

  it("evaluateRendererCompare meets target at 95% ratio", () => {
    const bench = {
      avgFps: 50,
      minFps: 45,
      maxFps: 55,
      avgFrameTime: 20,
      frameCount: 100,
      duration: 3000,
      pointsRendered: 200000,
      throughput: 1e7,
    };
    const cmp = evaluateRendererCompare(bench, { ...bench, avgFps: 48 }, true);
    expect(cmp.meetsTarget).toBe(true);
    expect(cmp.recommendation).toBe("webgpu-ready");
  });

  it("evaluateRendererCompare flags webgpu-unavailable", () => {
    const bench = {
      avgFps: 50,
      minFps: 45,
      maxFps: 55,
      avgFrameTime: 20,
      frameCount: 100,
      duration: 3000,
      pointsRendered: 200000,
      throughput: 1e7,
    };
    const cmp = evaluateRendererCompare(bench, null, false);
    expect(cmp.recommendation).toBe("webgpu-unavailable");
  });

  it("effectiveBenchmarkFps uses render throughput in headless when wall clock is throttled", () => {
    const result = {
      avgFps: 0.6,
      renderFps: 42,
      minFps: 0.6,
      maxFps: 42,
      avgFrameTime: 24,
      frameCount: 3,
      duration: 3000,
      pointsRendered: 500000,
      throughput: 300000,
    };
    expect(effectiveBenchmarkFps(result, true)).toBe(42);
    expect(effectiveBenchmarkFps(result, false)).toBe(0.6);
  });

  it("effectiveBenchmarkFps keeps wall clock on desktop", () => {
    const result = {
      avgFps: 58,
      renderFps: 120,
      minFps: 55,
      maxFps: 120,
      avgFrameTime: 8,
      frameCount: 150,
      duration: 2500,
      pointsRendered: 1e6,
      throughput: 58e6,
    };
    expect(effectiveBenchmarkFps(result, false)).toBe(58);
  });

  it("HEADLESS_LOW_FRAME_THRESHOLD documents rAF smoke boundary", () => {
    expect(HEADLESS_LOW_FRAME_THRESHOLD).toBe(30);
  });

  it("SMOKE_FLOORS defines candlestick headless minimum", () => {
    expect(SMOKE_FLOORS["candlestick-500k"]).toBe(25);
  });

  it("effectiveBenchmarkFps defaults missing metrics to zero", () => {
    // avgFps/renderFps/frameCount all undefined → each `?? 0` fallback fires.
    expect(effectiveBenchmarkFps({} as never, true)).toBe(0);
    expect(effectiveBenchmarkFps({} as never, false)).toBe(0);
  });

  it("effectiveBenchmarkFps keeps wall clock when headless has enough frames", () => {
    const result = {
      avgFps: 45,
      renderFps: 120,
      minFps: 40,
      maxFps: 50,
      avgFrameTime: 22,
      frameCount: 60,
      duration: 2500,
      pointsRendered: 1e6,
      throughput: 45e6,
    };
    expect(effectiveBenchmarkFps(result, true)).toBe(45);
  });

  it("buildStage1Report aggregates scenario results", async () => {
    const { buildStage1Report } = await import("./stage1BrowserBench");
    const report = buildStage1Report([
      { id: "a", benchmark: { avgFps: 50 } as any, passed: true, failures: [] },
      { id: "b", benchmark: { avgFps: 40 } as any, passed: false, failures: ["slow"] },
    ]);
    expect(report.allPassed).toBe(false);
    expect(report.scenarios).toHaveLength(2);
    expect(report.version).toBeTruthy();
  });

  it("compareScenarioToBaseline passes unknown scenarios", async () => {
    const { compareScenarioToBaseline } = await import("./stage1BrowserBench");
    const check = compareScenarioToBaseline("unknown-scenario", { avgFps: 1 });
    expect(check.passed).toBe(true);
  });

  it("compareScenarioToBaseline flags frame time regression", async () => {
    const { compareScenarioToBaseline } = await import("./stage1BrowserBench");
    const check = compareScenarioToBaseline("line-1m-pan", {
      avgFps: 60,
      minFps: 55,
      maxFps: 65,
      avgFrameTime: 50,
      frameCount: 100,
      duration: 3000,
      pointsRendered: 1e6,
      throughput: 60e6,
    });
    expect(check.passed).toBe(false);
    expect(check.failures.some((f) => f.includes("Frame time"))).toBe(true);
  });
});

describe("stacked chart overlay batching (1.12)", () => {
  it("setAllChartsResizeSuspended toggles all pane charts", async () => {
    const suspended: boolean[] = [];
    const makeChart = (id: string) => ({
      getId: () => id,
      setResizeSuspended: vi.fn((v: boolean) => {
        suspended.push(v);
      }),
    });

    const charts = new Map([
      ["a", makeChart("a")],
      ["b", makeChart("b")],
      ["c", makeChart("c")],
    ]);

    const setAll = (flag: boolean) => {
      for (const c of charts.values()) {
        c.setResizeSuspended(flag);
      }
    };

    setAll(true);
    expect(suspended.filter(Boolean).length).toBe(3);

    setAll(false);
    expect(suspended.filter((v) => !v).length).toBe(3);
  });
});
