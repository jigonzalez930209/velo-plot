import { describe, it, expect, vi } from "vitest";
import { fitToData, autoScaleAll, autoScaleYOnly, handleBoxZoom } from "./ChartScaling";

function mockSeries(
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number } | null,
  visible = true,
  yAxisId?: string,
) {
  return {
    isVisible: () => visible,
    getBounds: () => bounds,
    getYAxisId: () => yAxisId,
    getType: () => "line",
  };
}

function createScalingCtx(overrides: Record<string, unknown> = {}) {
  const setDomain = vi.fn();
  return {
    series: new Map<string, ReturnType<typeof mockSeries>>(),
    viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 50 },
    xAxisOptions: { auto: true },
    yAxisOptionsMap: new Map([["default", { auto: true }]]),
    yScales: new Map([
      ["default", { setDomain, domain: [0, 50] as [number, number] }],
    ]),
    primaryYAxisId: "default",
    getPlotArea: () => ({ x: 10, y: 10, width: 200, height: 100 }),
    requestRender: vi.fn(),
    ...overrides,
  } as unknown as Parameters<typeof fitToData>[0];
}

describe("fitToData", () => {
  it("returns false when there is no valid series data", () => {
    const ctx = {
      series: new Map(),
      viewBounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
      xAxisOptions: { auto: true },
      yAxisOptionsMap: new Map([["default", { auto: true }]]),
      yScales: new Map([
        ["default", { setDomain: vi.fn(), domain: [0, 1] as [number, number] }],
      ]),
      primaryYAxisId: "default",
      getPlotArea: () => ({ x: 0, y: 0, width: 100, height: 100 }),
      requestRender: vi.fn(),
    } as unknown as Parameters<typeof fitToData>[0];

    expect(fitToData(ctx)).toBe(false);
  });

  it("fits explicit X and Y without series", () => {
    const ctx = {
      series: new Map(),
      viewBounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
      xAxisOptions: { auto: true },
      yAxisOptionsMap: new Map([["default", { auto: true }]]),
      yScales: new Map([
        ["default", { setDomain: vi.fn(), domain: [0, 1] as [number, number] }],
      ]),
      primaryYAxisId: "default",
      getPlotArea: () => ({ x: 0, y: 0, width: 100, height: 100 }),
      requestRender: vi.fn(),
    } as unknown as Parameters<typeof fitToData>[0];

    const ok = fitToData(ctx, { x: [10, 20], y: [0, 100], padding: 0 });
    expect(ok).toBe(true);
    expect(ctx.viewBounds.xMin).toBe(10);
    expect(ctx.viewBounds.xMax).toBe(20);
    expect(ctx.viewBounds.yMin).toBe(0);
    expect(ctx.viewBounds.yMax).toBe(100);
  });

  it("fits from visible series bounds with padding", () => {
    const ctx = createScalingCtx();
    ctx.series.set("s1", mockSeries({ xMin: 10, xMax: 90, yMin: 5, yMax: 45 }));

    expect(fitToData(ctx, { padding: 0 })).toBe(true);
    expect(ctx.viewBounds.xMin).toBe(10);
    expect(ctx.viewBounds.xMax).toBe(90);
    expect(ctx.viewBounds.yMin).toBe(5);
    expect(ctx.viewBounds.yMax).toBe(45);
  });

  it("ignores invisible series", () => {
    const ctx = createScalingCtx();
    ctx.series.set("hidden", mockSeries({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, false));
    expect(fitToData(ctx)).toBe(false);
  });
});

describe("autoScaleAll", () => {
  it("updates view bounds from series data", () => {
    const ctx = createScalingCtx();
    ctx.series.set("s1", mockSeries({ xMin: 20, xMax: 80, yMin: 10, yMax: 40 }));

    autoScaleAll(ctx);

    expect(ctx.viewBounds.xMin).toBeLessThan(20);
    expect(ctx.viewBounds.xMax).toBeGreaterThan(80);
    expect(ctx.requestRender).toHaveBeenCalled();
  });

  it("no-ops when series map is empty", () => {
    const ctx = createScalingCtx();
    autoScaleAll(ctx);
    expect(ctx.requestRender).not.toHaveBeenCalled();
  });
});

describe("autoScaleYOnly", () => {
  it("keeps X stable and scales Y from series", () => {
    const ctx = createScalingCtx();
    const initialX = { ...ctx.viewBounds };
    ctx.series.set("s1", mockSeries({ xMin: 0, xMax: 100, yMin: 2, yMax: 8 }));

    autoScaleYOnly(ctx);

    expect(ctx.viewBounds.xMin).toBe(initialX.xMin);
    expect(ctx.viewBounds.xMax).toBe(initialX.xMax);
    expect(ctx.viewBounds.yMin).toBeLessThan(2);
    expect(ctx.viewBounds.yMax).toBeGreaterThan(8);
  });

  it("autoScaleYOnly skips axes with auto disabled", () => {
    const setDomain = vi.fn();
    const ctx = createScalingCtx({
      yAxisOptionsMap: new Map([["default", { auto: false }]]),
      yScales: new Map([["default", { setDomain, domain: [0, 50] as [number, number] }]]),
    });
    ctx.series.set("s1", mockSeries({ xMin: 0, xMax: 10, yMin: 1, yMax: 9 }));
    autoScaleYOnly(ctx);
    expect(setDomain).not.toHaveBeenCalled();
  });

  it("fitToData handles near-flat Y range from series", () => {
    const ctx = createScalingCtx();
    ctx.series.set("flat", mockSeries({ xMin: 0, xMax: 10, yMin: 5, yMax: 5.001 }));
    expect(fitToData(ctx)).toBe(true);
    expect(ctx.viewBounds.yMax).toBeGreaterThan(ctx.viewBounds.yMin);
  });
});

describe("handleBoxZoom", () => {
  it("zooms to selected rectangle when selection ends", () => {
    const ctx = createScalingCtx();
    const zoom = vi.fn();
    const rect = { x: 60, y: 20, width: 100, height: 50 };

    const result = handleBoxZoom(ctx, null, rect, zoom);

    expect(result).toBeNull();
    expect(zoom).toHaveBeenCalledWith(
      expect.objectContaining({
        x: expect.any(Array),
        y: expect.any(Array),
      }),
    );
  });

  it("ignores tiny selection rectangles", () => {
    const ctx = createScalingCtx();
    const zoom = vi.fn();
    handleBoxZoom(ctx, null, { x: 0, y: 0, width: 2, height: 2 }, zoom);
    expect(zoom).not.toHaveBeenCalled();
  });

  it("fitToData supports asymmetric padding object", () => {
    const ctx = createScalingCtx();
    ctx.series.set("s1", mockSeries({ xMin: 0, xMax: 100, yMin: 0, yMax: 50 }));
    expect(fitToData(ctx, { padding: { x: 0, y: 0 } })).toBe(true);
    expect(ctx.viewBounds.xMin).toBe(0);
    expect(ctx.viewBounds.yMin).toBe(0);
  });

  it("fitToData skips series with non-finite bounds", () => {
    const ctx = createScalingCtx();
    ctx.series.set("bad", mockSeries({ xMin: NaN, xMax: 100, yMin: 0, yMax: 50 }));
    expect(fitToData(ctx)).toBe(false);
  });

  it("returns selection rect while dragging", () => {
    const ctx = createScalingCtx();
    const zoom = vi.fn();
    const rect = { x: 10, y: 10, width: 50, height: 50 };
    expect(handleBoxZoom(ctx, rect, null, zoom)).toBe(rect);
  });
});

describe("ChartScaling edge cases", () => {
  it("autoScaleAll ignores invisible series and bails without valid data", () => {
    const ctx = createScalingCtx();
    ctx.series.set("hidden", mockSeries({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, false));
    autoScaleAll(ctx);
    expect(ctx.requestRender).not.toHaveBeenCalled();
  });

  it("autoScaleAll handles a degenerate single-point series", () => {
    const ctx = createScalingCtx();
    ctx.series.set("pt", mockSeries({ xMin: 5, xMax: 5, yMin: 7, yMax: 7 }));
    autoScaleAll(ctx);
    expect(ctx.viewBounds.xMax).toBeGreaterThan(ctx.viewBounds.xMin);
    expect(ctx.viewBounds.yMax).toBeGreaterThan(ctx.viewBounds.yMin);
  });

  it("autoScaleAll falls back to span 1 for a degenerate point at the origin", () => {
    const ctx = createScalingCtx();
    // Math.abs(0) * 0.1 === 0 (falsy) → the `|| 1` fallback span kicks in.
    ctx.series.set("origin", mockSeries({ xMin: 0, xMax: 0, yMin: 0, yMax: 0 }));
    autoScaleAll(ctx);
    expect(ctx.viewBounds.xMax).toBeGreaterThan(ctx.viewBounds.xMin);
    expect(ctx.viewBounds.yMax).toBeGreaterThan(ctx.viewBounds.yMin);
  });

  it("autoScaleAll tolerates a range that overflows to Infinity", () => {
    const ctx = createScalingCtx();
    // finite endpoints whose difference overflows: exercises the !isFinite guard.
    ctx.series.set("huge", mockSeries({ xMin: -1e308, xMax: 1e308, yMin: -1e308, yMax: 1e308 }));
    autoScaleAll(ctx);
    expect(Number.isFinite(ctx.viewBounds.xMin)).toBe(true);
    expect(Number.isFinite(ctx.viewBounds.xMax)).toBe(true);
  });

  it("autoScaleAll skips a second axis that has no data", () => {
    const setDomain = vi.fn();
    const ctx = createScalingCtx({
      yAxisOptionsMap: new Map([
        ["default", { auto: true }],
        ["right", { auto: true }],
      ]),
      yScales: new Map([
        ["default", { setDomain: vi.fn(), domain: [0, 50] as [number, number] }],
        ["right", { setDomain, domain: [0, 1] as [number, number] }],
      ]),
    });
    ctx.series.set("s1", mockSeries({ xMin: 0, xMax: 10, yMin: 1, yMax: 9 }));
    autoScaleAll(ctx);
    // 'right' axis got no series data, so its domain is never set.
    expect(setDomain).not.toHaveBeenCalled();
  });

  it("fitToData combines bounds from two visible series", () => {
    const ctx = createScalingCtx();
    ctx.series.set("a", mockSeries({ xMin: 10, xMax: 40, yMin: 5, yMax: 20 }));
    ctx.series.set("b", mockSeries({ xMin: 0, xMax: 90, yMin: 1, yMax: 60 }));
    expect(fitToData(ctx, { padding: 0 })).toBe(true);
    expect(ctx.viewBounds.xMin).toBe(0);
    expect(ctx.viewBounds.xMax).toBe(90);
  });

  it("fitToData supports padding object with only x", () => {
    const ctx = createScalingCtx();
    ctx.series.set("s1", mockSeries({ xMin: 0, xMax: 100, yMin: 0, yMax: 50 }));
    expect(fitToData(ctx, { padding: { x: 0 } })).toBe(true);
  });

  it("fitToData supports padding object with only y", () => {
    const ctx = createScalingCtx();
    ctx.series.set("s1", mockSeries({ xMin: 0, xMax: 100, yMin: 0, yMax: 50 }));
    expect(fitToData(ctx, { padding: { y: 0 } })).toBe(true);
  });

  it("fitToData with explicit y only derives x from series", () => {
    const ctx = createScalingCtx();
    ctx.series.set("s1", mockSeries({ xMin: 3, xMax: 33, yMin: 0, yMax: 1 }));
    expect(fitToData(ctx, { y: [0, 10], padding: 0 })).toBe(true);
    expect(ctx.viewBounds.xMin).toBe(3);
    expect(ctx.viewBounds.yMax).toBe(10);
  });

  it("fitToData skips an axis lacking options", () => {
    const setDomain = vi.fn();
    const ctx = createScalingCtx({
      yAxisOptionsMap: new Map([["default", { auto: true }]]),
      yScales: new Map([
        ["default", { setDomain: vi.fn(), domain: [0, 50] as [number, number] }],
        ["orphan", { setDomain, domain: [0, 1] as [number, number] }],
      ]),
    });
    ctx.series.set("s1", mockSeries({ xMin: 0, xMax: 10, yMin: 1, yMax: 9 }, true, "orphan"));
    expect(fitToData(ctx, { padding: 0 })).toBe(true);
    // 'orphan' axis has no options entry, so its domain is left untouched.
    expect(setDomain).not.toHaveBeenCalled();
  });

  it("fitToData handles a degenerate explicit x range", () => {
    const ctx = createScalingCtx();
    // Zero-width x range triggers the fallback range branch; default padding
    // then produces a small non-zero span around the point.
    expect(fitToData(ctx, { x: [5, 5], y: [0, 10] })).toBe(true);
    expect(ctx.viewBounds.xMax).toBeGreaterThan(ctx.viewBounds.xMin);
  });

  it("fitToData falls back to span 1 for a degenerate range at the origin", () => {
    const ctx = createScalingCtx();
    ctx.series.set("origin", mockSeries({ xMin: 0, xMax: 0, yMin: 0, yMax: 0 }));
    expect(fitToData(ctx)).toBe(true);
    expect(ctx.viewBounds.xMax).toBeGreaterThan(ctx.viewBounds.xMin);
    expect(ctx.viewBounds.yMax).toBeGreaterThan(ctx.viewBounds.yMin);
  });

  it("fitToData tolerates a series range that overflows to Infinity", () => {
    const ctx = createScalingCtx();
    ctx.series.set("huge", mockSeries({ xMin: -1e308, xMax: 1e308, yMin: -1e308, yMax: 1e308 }));
    expect(fitToData(ctx)).toBe(true);
    expect(Number.isFinite(ctx.viewBounds.xMin)).toBe(true);
    expect(Number.isFinite(ctx.viewBounds.yMax)).toBe(true);
  });

  it("autoScaleYOnly no-ops for an empty series map", () => {
    const ctx = createScalingCtx();
    autoScaleYOnly(ctx);
    expect(ctx.requestRender).not.toHaveBeenCalled();
  });

  it("autoScaleYOnly ignores invisible/non-finite series", () => {
    const ctx = createScalingCtx();
    ctx.series.set("hidden", mockSeries({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, false));
    ctx.series.set("bad", mockSeries({ xMin: 0, xMax: 1, yMin: NaN, yMax: 1 }));
    autoScaleYOnly(ctx);
    expect(ctx.requestRender).not.toHaveBeenCalled();
  });

  it("autoScaleYOnly handles a flat Y range and skips empty axes", () => {
    const setDomain = vi.fn();
    const ctx = createScalingCtx({
      yAxisOptionsMap: new Map([
        ["default", { auto: true }],
        ["right", { auto: true }],
      ]),
      yScales: new Map([
        ["default", { setDomain, domain: [0, 50] as [number, number] }],
        ["right", { setDomain: vi.fn(), domain: [0, 1] as [number, number] }],
      ]),
    });
    ctx.series.set("flat", mockSeries({ xMin: 0, xMax: 10, yMin: 4, yMax: 4 }));
    autoScaleYOnly(ctx);
    expect(setDomain).toHaveBeenCalled();
  });

  it("autoScaleYOnly falls back to span 1 for a flat range at the origin", () => {
    const ctx = createScalingCtx();
    ctx.series.set("origin", mockSeries({ xMin: 0, xMax: 10, yMin: 0, yMax: 0 }));
    autoScaleYOnly(ctx);
    expect(ctx.viewBounds.yMax).toBeGreaterThan(ctx.viewBounds.yMin);
  });

  it("autoScaleYOnly tolerates a Y range that overflows to Infinity", () => {
    const ctx = createScalingCtx();
    ctx.series.set("huge", mockSeries({ xMin: 0, xMax: 10, yMin: -1e308, yMax: 1e308 }));
    autoScaleYOnly(ctx);
    expect(Number.isFinite(ctx.viewBounds.yMin)).toBe(true);
  });
});
