import { describe, it, expect, vi } from "vitest";

// Force the algorithm helpers to return minimal payloads (missing the optional
// histogram/signal/upper/lower fields) so the defensive `?? fallback` branches
// in computeIndicatorPreset execute.
vi.mock("../../workers/indicatorsAsync", () => ({
  rsiAsync: vi.fn(async (data: Float32Array) => ({ values: data })),
  macdAsync: vi.fn(async (data: Float32Array) => ({ values: data })), // no histogram/signal
  bollingerBandsAsync: vi.fn(async (data: Float32Array) => ({ values: data })), // no upper/lower
  emaAsync: vi.fn(async (data: Float32Array) => ({ values: data })),
  smaAsync: vi.fn(async (data: Float32Array) => ({ values: data })),
}));

vi.mock("../../plugins/analysis/indicators", () => ({
  stochastic: vi.fn(() => ({ values: Float32Array.from([1, 2, 3]) })), // no signal
}));

import { computeIndicatorPreset } from "./indicatorPresets";
import { Series } from "../Series";

describe("computeIndicatorPreset defensive fallbacks", () => {
  const x = Float32Array.from({ length: 6 }, (_, i) => i);
  const prices = Float32Array.from({ length: 6 }, (_, i) => 100 + i);

  it("macd falls back to a zero histogram and reuses values for the signal", async () => {
    const result = await computeIndicatorPreset("macd", x, prices);
    expect(result.data.histogram).toBeDefined();
    // signal line falls back to the macd values
    expect(result.data.lines?.[1].y).toBe(result.data.lines?.[0].y);
  });

  it("bollinger falls back to mid values for upper and lower bands", async () => {
    const result = await computeIndicatorPreset("bollinger", x, prices);
    const fill = result.data.fills?.[0];
    expect(fill?.upper).toBe(result.data.lines?.[0].y);
    expect(fill?.lower).toBe(result.data.lines?.[0].y);
  });

  it("stochastic reuses %K values when %D signal is missing", async () => {
    const src = new Series({
      id: "c",
      type: "candlestick",
      data: {
        x,
        open: prices,
        high: prices,
        low: prices,
        close: prices,
      },
    } as never);
    const result = await computeIndicatorPreset("stochastic", x, prices, {}, src);
    expect(result.data.lines?.[1].y).toBe(result.data.lines?.[0].y);
  });
});
