import { describe, it, expect } from "vitest";
import { createMockDatafeed } from "../trading/mockDatafeed";
import { barsToOhlc } from "../trading/datafeed";

describe("mockDatafeed", () => {
  it("resolveSymbol returns symbol info", async () => {
    const feed = createMockDatafeed({ symbol: "TEST" });
    const info = await feed.resolveSymbol("TEST");
    expect(info.symbol).toBe("TEST");
  });

  it("getBars returns OHLC history", async () => {
    const feed = createMockDatafeed();
    const bars = await feed.getBars({
      symbol: "MOCK",
      resolution: "1",
      from: Date.UTC(2024, 0, 1),
      to: Date.UTC(2024, 0, 2),
    });
    expect(bars.length).toBeGreaterThan(0);
    const ohlc = barsToOhlc(bars);
    expect(ohlc.close.length).toBe(bars.length);
  });
});
