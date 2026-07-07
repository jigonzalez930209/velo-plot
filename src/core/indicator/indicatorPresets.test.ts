import { describe, it, expect } from "vitest";
import { Series } from "../Series";
import {
  computeIndicatorPreset,
  extractOhlcSeries,
  extractPriceSeries,
  resolveSourceSeries,
} from "./indicatorPresets";

function candlestick(n = 20) {
  const x = Float32Array.from({ length: n }, (_, i) => i);
  const close = Float32Array.from({ length: n }, (_, i) => 100 + i);
  return new Series({
    id: "c",
    type: "candlestick",
    data: { x, open: close, high: close, low: close, close },
  });
}

function line(n = 20) {
  const x = Float32Array.from({ length: n }, (_, i) => i);
  const y = Float32Array.from({ length: n }, (_, i) => i * 2);
  return new Series({ id: "l", type: "line", data: { x, y } });
}

describe("indicatorPresets helpers", () => {
  it("extractPriceSeries uses y for line series", () => {
    const s = line(5);
    const { prices } = extractPriceSeries(s);
    expect(prices[2]).toBe(4);
  });

  it("extractPriceSeries throws without x data", () => {
    const s = new Series({ id: "e", type: "line", data: { x: new Float32Array(0), y: new Float32Array(0) } });
    expect(() => extractPriceSeries(s)).toThrow(/no X data/i);
  });

  it("extractPriceSeries throws without price data", () => {
    const s = new Series({ id: "e", type: "line", data: { x: Float32Array.from([1]), y: new Float32Array(0) } });
    expect(() => extractPriceSeries(s)).toThrow(/no price/i);
  });

  it("extractOhlcSeries throws without OHLC fields", () => {
    const s = new Series({
      id: "e",
      type: "candlestick",
      data: {
        x: Float32Array.from([1]),
        open: new Float32Array(0),
        high: new Float32Array(0),
        low: new Float32Array(0),
        close: new Float32Array(0),
      },
    });
    expect(() => extractOhlcSeries(s)).toThrow(/OHLC/i);
  });

  it("resolveSourceSeries picks first price series when id omitted", () => {
    const chart = {
      getSeries: () => undefined,
      getAllSeries: () => [line(), candlestick()],
    };
    expect(resolveSourceSeries(chart).getId()).toBe("l");
  });

  it("resolveSourceSeries throws for missing id", () => {
    const chart = { getSeries: () => undefined, getAllSeries: () => [] };
    expect(() => resolveSourceSeries(chart, "missing")).toThrow(/not found/i);
  });

  it("resolveSourceSeries throws when no suitable series exists", () => {
    const scatter = new Series({
      id: "s",
      type: "scatter",
      data: { x: Float32Array.from([1]), y: Float32Array.from([2]) },
    });
    const chart = { getSeries: () => undefined, getAllSeries: () => [scatter] };
    expect(() => resolveSourceSeries(chart)).toThrow(/sourceSeriesId/i);
  });

  it("computeIndicatorPreset accepts bollingerBands alias", async () => {
    const n = 40;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const prices = Float32Array.from({ length: n }, (_, i) => 50 + i * 0.2);
    const result = await computeIndicatorPreset("bollingerBands", x, prices, { period: 10 });
    expect(result.preset).toBe("bollinger");
    expect(result.placement).toBe("overlay");
  });

  it("computeIndicatorPreset coerces plain number[] x", async () => {
    const x = Array.from({ length: 30 }, (_, i) => i);
    const prices = Float32Array.from({ length: 30 }, (_, i) => 100 + i);
    const result = await computeIndicatorPreset("sma", x, prices, { period: 5 });
    expect(result.data.lines?.[0].y.length).toBe(30);
  });
});
