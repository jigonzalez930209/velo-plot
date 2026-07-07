import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockDatafeed } from "../trading/mockDatafeed";
import { barsToOhlc } from "../trading/datafeed";

describe("mockDatafeed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("getBars caches repeated requests", async () => {
    const feed = createMockDatafeed({ seed: 7 });
    const req = {
      symbol: "MOCK",
      resolution: "1",
      from: Date.UTC(2024, 0, 1),
      to: Date.UTC(2024, 0, 1, 2),
    };
    const first = await feed.getBars(req);
    const second = await feed.getBars(req);
    expect(second).toBe(first);
  });

  it("subscribeBars emits bars and unsubscribe stops updates", async () => {
    const feed = createMockDatafeed({ barMs: 1000 });
    const bars: unknown[] = [];
    const unsub = feed.subscribeBars({
      symbol: "MOCK",
      resolution: "1",
      onBar: (bar) => bars.push(bar),
    });
    vi.advanceTimersByTime(2500);
    expect(bars.length).toBeGreaterThanOrEqual(2);
    unsub();
    const count = bars.length;
    vi.advanceTimersByTime(5000);
    expect(bars.length).toBe(count);
  });
});
