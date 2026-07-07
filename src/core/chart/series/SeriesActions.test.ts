import { describe, it, expect, vi } from "vitest";
import {
  addSeries,
  removeSeries,
  updateSeries,
  appendData,
  setMaxPoints,
} from "./SeriesActions";
import { Series } from "../../Series";

function makeCtx(overrides: Record<string, unknown> = {}) {
  const series = new Map<string, Series>();
  return {
    series,
    renderer: {
      createBuffer: vi.fn(),
      deleteBuffer: vi.fn(),
    },
    viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 50 },
    xAxisOptions: { auto: false },
    yAxisOptionsMap: new Map([["y", { auto: false }]]),
    autoScale: vi.fn(),
    autoScaleYOnly: vi.fn(),
    autoScrollEnabled: false,
    requestRender: vi.fn(),
    updateLegend: vi.fn(),
    timeScaleMapping: null as unknown,
    colorScheme: undefined as { colors: string[] } | undefined,
    ...overrides,
  };
}

function lineSeries(id: string, n = 10) {
  return {
    id,
    type: "line" as const,
    data: {
      x: Float32Array.from({ length: n }, (_, i) => i),
      y: Float32Array.from({ length: n }, (_, i) => i * 2),
    },
  };
}

describe("SeriesActions trading transforms", () => {
  it("converts heikin-ashi series to candlestick OHLC", () => {
    const ctx = makeCtx();
    const n = 5;
    const open = Float32Array.from({ length: n }, (_, i) => 100 + i);
    const high = Float32Array.from({ length: n }, (_, i) => 102 + i);
    const low = Float32Array.from({ length: n }, (_, i) => 98 + i);
    const close = Float32Array.from({ length: n }, (_, i) => 101 + i);
    addSeries(ctx, {
      id: "ha",
      type: "heikin-ashi",
      data: {
        x: Float64Array.from({ length: n }, (_, i) => Date.UTC(2024, 0, 2 + i)),
        open,
        high,
        low,
        close,
      },
    });
    expect(ctx.series.get("ha")?.getType()).toBe("candlestick");
  });

  it("maps business-day timestamps to logical x indices", () => {
    const ctx = makeCtx({
      xAxisOptions: { type: "time", auto: true, timeScale: { calendar: "business-day" } },
    });
    const times = Float64Array.from([
      Date.UTC(2024, 0, 5),
      Date.UTC(2024, 0, 6),
      Date.UTC(2024, 0, 8),
    ]);
    addSeries(ctx, {
      id: "c",
      type: "candlestick",
      data: {
        x: times,
        open: Float32Array.from([1, 2, 3]),
        high: Float32Array.from([2, 3, 4]),
        low: Float32Array.from([0, 1, 2]),
        close: Float32Array.from([1.5, 2.5, 3.5]),
      },
    });
    const x = ctx.series.get("c")!.getData().x;
    expect(x[0]).toBe(0);
    expect(Number.isNaN(x[1])).toBe(true);
    expect(x[2]).toBe(1);
    expect(ctx.autoScale).toHaveBeenCalled();
  });

  it("updateSeries remaps x when business-day scale is active", () => {
    const ctx = makeCtx({
      xAxisOptions: { type: "time", auto: false, timeScale: { calendar: "business-day" } },
    });
    addSeries(ctx, {
      id: "c",
      type: "line",
      data: {
        x: Float64Array.from([Date.UTC(2024, 0, 5)]),
        y: Float32Array.from([1]),
      },
    });
    updateSeries(ctx, "c", {
      x: Float64Array.from([Date.UTC(2024, 0, 5), Date.UTC(2024, 0, 8)]),
      y: Float32Array.from([1, 2]),
    });
    const x = ctx.series.get("c")!.getData().x;
    expect(x[1]).toBe(1);
  });
});

describe("SeriesActions lifecycle", () => {
  it("removeSeries deletes buffers and legend updates", () => {
    const ctx = makeCtx();
    addSeries(ctx, lineSeries("a"));
    removeSeries(ctx, "a");
    expect(ctx.renderer.deleteBuffer).toHaveBeenCalledWith("a");
    expect(ctx.series.has("a")).toBe(false);
    expect(ctx.updateLegend).toHaveBeenCalled();
  });

  it("removeSeries is no-op for unknown id", () => {
    const ctx = makeCtx();
    removeSeries(ctx, "missing");
    expect(ctx.renderer.deleteBuffer).not.toHaveBeenCalled();
  });

  it("appendData with autoscroll pans view when at trailing edge", () => {
    const ctx = makeCtx({
      autoScrollEnabled: true,
      viewBounds: { xMin: 90, xMax: 100, yMin: 0, yMax: 50 },
      yAxisOptionsMap: new Map([["y", { auto: true }]]),
    });
    addSeries(ctx, lineSeries("s", 100));
    appendData(ctx, "s", [100, 101], [200, 202]);
    expect(ctx.viewBounds.xMax).toBeGreaterThan(100);
    expect(ctx.autoScaleYOnly).toHaveBeenCalled();
  });

  it("appendData without autoscroll may expand x bounds when auto x", () => {
    const ctx = makeCtx({
      xAxisOptions: { auto: true },
      viewBounds: { xMin: 0, xMax: 5, yMin: 0, yMax: 50 },
      yAxisOptionsMap: new Map([["y", { auto: true }]]),
    });
    addSeries(ctx, lineSeries("s", 20));
    appendData(ctx, "s", Float32Array.from([20, 21, 22]), Float32Array.from([1, 2, 3]));
    expect(ctx.viewBounds.xMax).toBeGreaterThan(5);
    expect(ctx.autoScaleYOnly).toHaveBeenCalled();
  });

  it("appendData ignores missing series", () => {
    const ctx = makeCtx();
    appendData(ctx, "nope", [1], [2]);
    expect(ctx.requestRender).not.toHaveBeenCalled();
  });

  it("setMaxPoints updates series cap", () => {
    const ctx = makeCtx();
    addSeries(ctx, lineSeries("s"));
    setMaxPoints(ctx, "s", 500);
    expect(ctx.requestRender).toHaveBeenCalled();
  });

  it("assigns color from scheme when style.color missing", () => {
    const ctx = makeCtx({
      colorScheme: { colors: ["#ff0000", "#00ff00"] },
    });
    addSeries(ctx, { ...lineSeries("a"), style: {} });
    addSeries(ctx, { ...lineSeries("b"), style: {} });
    expect(ctx.series.get("a")?.getStyle().color).toBe("#ff0000");
    expect(ctx.series.get("b")?.getStyle().color).toBe("#00ff00");
  });
});
