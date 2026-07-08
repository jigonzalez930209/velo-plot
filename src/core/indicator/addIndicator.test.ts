import { describe, it, expect, vi } from "vitest";
import { Series } from "../Series";
import {
  computeIndicatorPreset,
  extractPriceSeries,
  isOverlayPreset,
} from "./indicatorPresets";
import { addIndicatorToChart, buildIndicatorPaneFromPreset } from "./addIndicator";

function makeCloseSeries(n = 120) {
  const x = Float32Array.from({ length: n }, (_, i) => i);
  const close = Float32Array.from({ length: n }, (_, i) => 100 + Math.sin(i * 0.1) * 5);
  return new Series({
    id: "candles",
    type: "candlestick",
    data: { x, y: close, open: close, high: close, low: close, close },
  });
}

describe("addIndicator", () => {
  it("computeIndicatorPreset builds RSI oscillator data", async () => {
    const n = 80;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const prices = Float32Array.from({ length: n }, (_, i) => 50 + i * 0.2);
    const result = await computeIndicatorPreset("rsi", x, prices, { period: 14 });
    expect(result.placement).toBe("oscillator");
    expect(result.yRange).toEqual([0, 100]);
    expect(result.data.lines?.[0].y.length).toBe(n);
    expect(result.data.referenceLines?.length).toBe(2);
  });

  it("computeIndicatorPreset builds MACD histogram + lines", async () => {
    const n = 100;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const prices = Float32Array.from({ length: n }, (_, i) => 100 + Math.sin(i * 0.05) * 10);
    const result = await computeIndicatorPreset("macd", x, prices);
    expect(result.placement).toBe("oscillator");
    expect(result.data.histogram).toBeDefined();
    expect(result.data.lines?.length).toBe(2);
  });

  it("computeIndicatorPreset builds Bollinger overlay bands", async () => {
    const n = 60;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const prices = Float32Array.from({ length: n }, (_, i) => 100 + i * 0.1);
    const result = await computeIndicatorPreset("bollinger", x, prices, { period: 20 });
    expect(result.placement).toBe("overlay");
    expect(result.data.fills?.length).toBe(1);
    expect(result.data.lines?.length).toBe(1);
  });

  it("extractPriceSeries uses close for candlesticks", () => {
    const s = makeCloseSeries(10);
    const { x, prices } = extractPriceSeries(s);
    expect(x.length).toBe(10);
    expect(prices.length).toBe(10);
  });

  it("addIndicatorToChart adds expanded series to chart", async () => {
    const source = makeCloseSeries(100);
    const added: string[] = [];
    const chart = {
      getSeries: (id: string) => (id === "candles" ? source : undefined),
      getAllSeries: () => [source],
      addSeries: vi.fn((opts: { id: string }) => {
        added.push(opts.id);
      }),
      removeSeries: vi.fn(),
    };

    const result = await addIndicatorToChart(chart, "ema", { period: 10, id: "ema20" });
    expect(result.placement).toBe("overlay");
    expect(result.seriesIds.length).toBeGreaterThan(0);
    expect(chart.addSeries).toHaveBeenCalled();
  });

  it("buildIndicatorPaneFromPreset returns stacked pane config", async () => {
    const n = 90;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const prices = Float32Array.from({ length: n }, (_, i) => 100 + Math.sin(i * 0.08) * 8);
    const pane = await buildIndicatorPaneFromPreset("rsi", x, prices, {
      id: "rsi-pane",
      label: "RSI",
      height: 0.22,
    });
    expect(pane.id).toBe("rsi-pane");
    expect(pane.series?.length).toBeGreaterThan(0);
    expect(pane.yRange).toEqual([0, 100]);
  });

  it("buildIndicatorPaneFromPreset applies default id, height, label, and yRange", async () => {
    const n = 60;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const prices = Float32Array.from({ length: n }, (_, i) => 100 + i * 0.1);
    // ema is an overlay preset with no computed yRange → falls back to "auto"
    const pane = await buildIndicatorPaneFromPreset("ema", x, prices, {});
    expect(pane.id).toBe("ema"); // options.id omitted → computed.id
    expect(pane.height).toBe(0.25); // options.height omitted → default
    expect(pane.yRange).toBe("auto"); // no options.yRange, no computed.yRange
  });

  it("computeIndicatorPreset builds EMA and SMA overlays", async () => {
    const n = 60;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const prices = Float32Array.from({ length: n }, (_, i) => 100 + i * 0.1);
    const ema = await computeIndicatorPreset("ema", x, prices, { period: 10 });
    const sma = await computeIndicatorPreset("sma", x, prices, { period: 10 });
    expect(ema.placement).toBe("overlay");
    expect(sma.placement).toBe("overlay");
    expect(ema.data.lines?.[0].y.length).toBe(n);
  });

  it("isOverlayPreset identifies overlay vs oscillator presets", () => {
    expect(isOverlayPreset("ema")).toBe(true);
    expect(isOverlayPreset("bollingerBands")).toBe(true);
    expect(isOverlayPreset("rsi")).toBe(false);
  });

  it("addIndicatorToChart rejects pane:new on standalone chart", async () => {
    const chart = {
      getSeries: vi.fn(),
      getAllSeries: vi.fn(() => []),
      addSeries: vi.fn(),
      removeSeries: vi.fn(),
    };
    await expect(
      addIndicatorToChart(chart, "rsi", { pane: "new", period: 14 }),
    ).rejects.toThrow("pane: 'new'");
  });

  it("computeIndicatorPreset builds stochastic oscillator from OHLC source", async () => {
    const source = makeCloseSeries(80);
    const { x, prices } = extractPriceSeries(source);
    const result = await computeIndicatorPreset("stochastic", x, prices, { period: 14 }, source);
    expect(result.placement).toBe("oscillator");
    expect(result.data.lines?.length).toBe(2);
    expect(result.data.referenceLines?.length).toBe(2);
  });

  it("stochastic throws without candlestick source", async () => {
    const x = Float32Array.from([0, 1, 2]);
    const prices = Float32Array.from([1, 2, 3]);
    await expect(computeIndicatorPreset("stochastic", x, prices)).rejects.toThrow("candlestick");
  });

  it("addIndicatorToChart removes prior indicator series with same root id", async () => {
    const source = makeCloseSeries(50);
    const removed: string[] = [];
    const chart = {
      getSeries: (id: string) => (id === "candles" ? source : { getId: () => id }),
      getAllSeries: () => [
        source,
        { getId: () => "ema" },
        { getId: () => "ema-band" },
      ],
      addSeries: vi.fn(),
      removeSeries: vi.fn((id: string) => removed.push(id)),
    };
    await addIndicatorToChart(chart, "ema", { period: 10, id: "ema" });
    expect(removed).toContain("ema");
    expect(removed).toContain("ema-band");
  });

  it("resolveSourceSeries error propagates from addIndicatorToChart", async () => {
    const chart = {
      getSeries: () => undefined,
      getAllSeries: () => [],
      addSeries: vi.fn(),
      removeSeries: vi.fn(),
    };
    await expect(
      addIndicatorToChart(chart, "rsi", { sourceSeriesId: "nope", period: 14 }),
    ).rejects.toThrow(/not found/i);
  });
});
