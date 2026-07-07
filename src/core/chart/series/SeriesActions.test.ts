import { describe, it, expect, vi } from "vitest";
import { addSeries, updateSeries } from "./SeriesActions";
import { Series } from "../../Series";

function makeCtx(xAxisOptions: Record<string, unknown> = { auto: true }) {
  const series = new Map<string, Series>();
  return {
    series,
    renderer: {
      createBuffer: vi.fn(),
      deleteBuffer: vi.fn(),
    },
    viewBounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 100 },
    xAxisOptions,
    yAxisOptionsMap: new Map([["y", { auto: true }]]),
    autoScale: vi.fn(),
    requestRender: vi.fn(),
    updateLegend: vi.fn(),
    timeScaleMapping: null as unknown,
  };
}

function ohlc(n: number) {
  const x = Float64Array.from({ length: n }, (_, i) => Date.UTC(2024, 0, 2 + i));
  const open = Float32Array.from({ length: n }, (_, i) => 100 + i);
  const high = Float32Array.from({ length: n }, (_, i) => 102 + i);
  const low = Float32Array.from({ length: n }, (_, i) => 98 + i);
  const close = Float32Array.from({ length: n }, (_, i) => 101 + i);
  return { x, open, high, low, close };
}

describe("SeriesActions trading transforms", () => {
  it("converts heikin-ashi series to candlestick OHLC", () => {
    const ctx = makeCtx();
    const data = ohlc(5);
    addSeries(ctx, {
      id: "ha",
      type: "heikin-ashi",
      data,
    });
    const s = ctx.series.get("ha");
    expect(s?.getType()).toBe("candlestick");
    const d = s!.getData();
    expect(d.close[0]).not.toBe(data.close[0]);
  });

  it("maps business-day timestamps to logical x indices", () => {
    const ctx = makeCtx({
      type: "time",
      auto: true,
      timeScale: { calendar: "business-day" },
    });
    const times = Float64Array.from([
      Date.UTC(2024, 0, 5),
      Date.UTC(2024, 0, 6),
      Date.UTC(2024, 0, 8),
    ]);
    const data = ohlc(3);
    data.x = times;

    addSeries(ctx, {
      id: "c",
      type: "candlestick",
      data,
    });

    expect(ctx.timeScaleMapping).toBeTruthy();
    const x = ctx.series.get("c")!.getData().x;
    expect(x[0]).toBe(0);
    expect(Number.isNaN(x[1])).toBe(true);
    expect(x[2]).toBe(1);
  });

  it("updateSeries remaps x when business-day scale is active", () => {
    const ctx = makeCtx({
      type: "time",
      auto: true,
      timeScale: { calendar: "business-day" },
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
    expect(x[0]).toBe(0);
    expect(x[1]).toBe(1);
  });
});
