import { describe, it, expect, vi } from "vitest";
import "../../../trading/registerTrading";
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
  let timeScaleMapping: unknown = null;
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
    getTimeScaleMapping: () => timeScaleMapping,
    setTimeScaleMapping: (v: unknown) => {
      timeScaleMapping = v;
    },
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

  it("updateSeries append with autoscroll keeps a fixed X window", () => {
    const ctx = makeCtx({
      autoScrollEnabled: true,
      viewBounds: { xMin: 90, xMax: 100, yMin: 0, yMax: 50 },
      yAxisOptionsMap: new Map([["y", { auto: true }]]),
    });
    addSeries(ctx, lineSeries("s", 101));
    const spanBefore = ctx.viewBounds.xMax - ctx.viewBounds.xMin;
    updateSeries(ctx, "s", {
      x: Float32Array.from([101, 102]),
      y: Float32Array.from([200, 202]),
      append: true,
    });
    const spanAfter = ctx.viewBounds.xMax - ctx.viewBounds.xMin;
    expect(ctx.viewBounds.xMax).toBeGreaterThan(100);
    expect(spanAfter).toBeCloseTo(spanBefore, 5);
    expect(ctx.autoScaleYOnly).toHaveBeenCalled();
  });

  it("updateSeries append without autoscroll expands X when axis.auto", () => {
    const ctx = makeCtx({
      autoScrollEnabled: false,
      xAxisOptions: { auto: true },
      viewBounds: { xMin: 0, xMax: 5, yMin: 0, yMax: 50 },
      yAxisOptionsMap: new Map([["y", { auto: true }]]),
    });
    addSeries(ctx, lineSeries("s", 20));
    updateSeries(ctx, "s", {
      x: Float32Array.from([20, 21, 22]),
      y: Float32Array.from([1, 2, 3]),
      append: true,
    });
    expect(ctx.viewBounds.xMax).toBeGreaterThan(5);
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

  it("addSeries expands indicator type into multiple series", () => {
    const ctx = makeCtx();
    addSeries(ctx, {
      id: "ind",
      type: "indicator",
      data: {
        x: Float32Array.from([0, 1, 2]),
        lines: [{ id: "l1", y: Float32Array.from([1, 2, 3]), color: "#fff" }],
      },
    });
    expect(ctx.series.has("l1")).toBe(true);
  });

  it("returns heatmap options unchanged (no prepare transforms)", () => {
    const ctx = makeCtx();
    addSeries(ctx, {
      id: "hm",
      type: "heatmap",
      data: {
        x: Float32Array.from([0, 1]),
        y: Float32Array.from([0, 1]),
        z: Float32Array.from([1, 2, 3, 4]),
      },
    } as never);
    expect(ctx.series.has("hm")).toBe(true);
  });

  it("initializes an empty style object before assigning a scheme color", () => {
    const ctx = makeCtx({ colorScheme: { colors: ["#abcdef"] } });
    // no style key at all → the `if (!prepared.style)` branch initializes it
    addSeries(ctx, lineSeries("nostyle"));
    expect(ctx.series.get("nostyle")?.getStyle().color).toBe("#abcdef");
  });

  it("appendData tolerates a series with no initial bounds", () => {
    const ctx = makeCtx({ autoScrollEnabled: true, yAxisOptionsMap: new Map([["y", { auto: false }]]) });
    addSeries(ctx, { id: "empty", type: "line", data: { x: new Float32Array(0), y: new Float32Array(0) } });
    // oldMaxX falls back to -Infinity because getBounds() is null
    expect(() => appendData(ctx, "empty", [0, 1], [1, 2])).not.toThrow();
    expect(ctx.requestRender).toHaveBeenCalled();
  });

  it("expands x bounds when appended data extends below the view", () => {
    const ctx = makeCtx({
      xAxisOptions: { auto: true },
      viewBounds: { xMin: 5, xMax: 100, yMin: 0, yMax: 50 },
      yAxisOptionsMap: new Map([["y", { auto: false }]]),
    });
    addSeries(ctx, {
      id: "s",
      type: "line",
      data: { x: Float32Array.from([0, 1, 2]), y: Float32Array.from([1, 2, 3]) },
    });
    // xMax stays below the view but xMin (0) is below viewBounds.xMin (5)
    appendData(ctx, "s", Float32Array.from([3]), Float32Array.from([4]));
    expect(ctx.viewBounds.xMin).toBeLessThan(5);
  });

  it("leaves x bounds untouched when the appended range barely changes", () => {
    const ctx = makeCtx({
      xAxisOptions: { auto: true },
      viewBounds: { xMin: 0, xMax: 1000, yMin: 0, yMax: 50 },
      yAxisOptionsMap: new Map([["y", { auto: false }]]),
    });
    addSeries(ctx, {
      id: "s",
      type: "line",
      // range ~940 is within 10% of the 1000-wide view and stays inside it
      data: {
        x: Float32Array.from({ length: 941 }, (_, i) => 40 + i),
        y: Float32Array.from({ length: 941 }, (_, i) => i),
      },
    });
    const beforeMax = ctx.viewBounds.xMax;
    // stays well within the view and range change is < 10% → no bounds update
    appendData(ctx, "s", Float32Array.from([981]), Float32Array.from([1]));
    expect(ctx.viewBounds.xMax).toBe(beforeMax);
  });

  it("updateSeries is a no-op for unknown series id", () => {
    const ctx = makeCtx();
    updateSeries(ctx, "missing", { x: Float32Array.from([0]), y: Float32Array.from([1]) });
    expect(ctx.requestRender).not.toHaveBeenCalled();
  });

  it("autoscroll skips viewport pan when append is far from the trailing edge", () => {
    const ctx = makeCtx({
      autoScrollEnabled: true,
      viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 50 },
      yAxisOptionsMap: new Map([["y", { auto: false }]]),
    });
    addSeries(ctx, {
      id: "s",
      type: "line",
      data: {
        x: Float32Array.from({ length: 50 }, (_, i) => i),
        y: Float32Array.from({ length: 50 }, (_, i) => i),
      },
    });
    const xmaxBefore = ctx.viewBounds.xMax;
    updateSeries(ctx, "s", {
      x: Float32Array.from([10, 11]),
      y: Float32Array.from([1, 2]),
      append: true,
    });
    expect(ctx.viewBounds.xMax).toBe(xmaxBefore);
  });

  it("expands x bounds when appended data range shifts more than 10%", () => {
    const ctx = makeCtx({
      autoScrollEnabled: false,
      xAxisOptions: { auto: true },
      viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 50 },
      yAxisOptionsMap: new Map([["y", { auto: false }]]),
    });
    addSeries(ctx, {
      id: "s",
      type: "line",
      data: {
        x: Float32Array.from({ length: 20 }, (_, i) => i),
        y: Float32Array.from({ length: 20 }, (_, i) => i),
      },
    });
    updateSeries(ctx, "s", {
      x: Float32Array.from({ length: 200 }, (_, i) => i),
      y: Float32Array.from({ length: 200 }, (_, i) => i),
      append: true,
    });
    expect(ctx.viewBounds.xMax).toBeGreaterThan(100);
  });

  it("updateSeries append treats missing bounds as -Infinity trailing edge", () => {
    const ctx = makeCtx({ autoScrollEnabled: true });
    addSeries(ctx, { id: "empty", type: "line", data: { x: new Float32Array(0), y: new Float32Array(0) } });
    updateSeries(ctx, "empty", {
      x: Float32Array.from([0, 1]),
      y: Float32Array.from([1, 2]),
      append: true,
    });
    expect(ctx.requestRender).toHaveBeenCalled();
  });

  it("autoscroll derives range from data when the view x span is zero", () => {
    const ctx = makeCtx({
      autoScrollEnabled: true,
      viewBounds: { xMin: 50, xMax: 50, yMin: 0, yMax: 50 },
      yAxisOptionsMap: new Map([["y", { auto: false }]]),
    });
    addSeries(ctx, {
      id: "s",
      type: "line",
      data: {
        x: Float32Array.from({ length: 51 }, (_, i) => i),
        y: Float32Array.from({ length: 51 }, (_, i) => i),
      },
    });
    updateSeries(ctx, "s", {
      x: Float32Array.from([51, 52]),
      y: Float32Array.from([51, 52]),
      append: true,
    });
    expect(ctx.viewBounds.xMax).toBeGreaterThan(50);
    expect(ctx.viewBounds.xMax - ctx.viewBounds.xMin).toBeGreaterThan(0);
  });

  it("updateSeries without append does not read trailing bounds", () => {
    const ctx = makeCtx({ autoScrollEnabled: true });
    addSeries(ctx, lineSeries("s", 5));
    const getBounds = vi.spyOn(ctx.series.get("s")!, "getBounds");
    updateSeries(ctx, "s", {
      x: Float32Array.from([0, 1, 2, 3, 4]),
      y: Float32Array.from([0, 1, 2, 3, 4]),
    });
    expect(getBounds).not.toHaveBeenCalled();
  });

  it("skips heikin-ashi transform when OHLC is incomplete", () => {
    const ctx = makeCtx();
    addSeries(ctx, {
      id: "ha",
      type: "heikin-ashi" as any,
      data: { x: Float32Array.from([0, 1]), y: Float32Array.from([1, 2]) },
    });
    expect(ctx.series.get("ha")?.getType()).toBe("heikin-ashi");
  });
});
