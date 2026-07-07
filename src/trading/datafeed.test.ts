import { describe, it, expect } from "vitest";
import { barsToOhlc } from "./datafeed";
import type { Bar } from "./datafeed";

describe("barsToOhlc", () => {
  it("maps bar fields to typed arrays", () => {
    const bars: Bar[] = [
      { time: 1000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      { time: 2000, open: 1.5, high: 2.5, low: 1, close: 2, volume: 200 },
    ];
    const ohlc = barsToOhlc(bars);
    expect(ohlc.x[0]).toBe(1000);
    expect(ohlc.close[1]).toBe(2);
    expect(ohlc.volume[0]).toBe(100);
  });

  it("defaults missing volume to zero", () => {
    const bars: Bar[] = [{ time: 1, open: 1, high: 1, low: 1, close: 1 }];
    const ohlc = barsToOhlc(bars);
    expect(ohlc.volume[0]).toBe(0);
  });
});
