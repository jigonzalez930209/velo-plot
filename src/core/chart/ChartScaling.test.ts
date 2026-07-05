import { describe, it, expect, vi } from "vitest";
import { fitToData } from "./ChartScaling";

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
});
