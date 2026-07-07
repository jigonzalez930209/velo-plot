import { describe, it, expect, vi } from "vitest";
import { fitToData, autoScaleAll, autoScaleYOnly, handleBoxZoom } from "./ChartScaling";

function mockSeries(
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number } | null,
  visible = true,
) {
  return {
    isVisible: () => visible,
    getBounds: () => bounds,
    getYAxisId: () => undefined,
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
