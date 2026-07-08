import { describe, it, expect } from "vitest";
import {
  generateBusinessDayOhlcv,
  generateContinuousOhlcv,
  findLowestBarIndex,
  findHighestBarIndex,
} from "./ohlcvGenerator";

const MS_DAY = 86_400_000;

describe("ohlcvGenerator", () => {
  it("produces deterministic output when seed is set", () => {
    const a = generateBusinessDayOhlcv(20, { seed: 42 });
    const b = generateBusinessDayOhlcv(20, { seed: 42 });
    expect(Array.from(a.close)).toEqual(Array.from(b.close));
    expect(Array.from(a.x)).toEqual(Array.from(b.x));
  });

  it("findLowestBarIndex and findHighestBarIndex locate extrema", () => {
    const data = generateBusinessDayOhlcv(30, { seed: 7 });
    const lowIdx = findLowestBarIndex(data.low);
    const highIdx = findHighestBarIndex(data.high);
    for (let i = 0; i < data.low.length; i++) {
      expect(data.low[i]).toBeGreaterThanOrEqual(data.low[lowIdx]);
      expect(data.high[i]).toBeLessThanOrEqual(data.high[highIdx]);
    }
  });

  it("business-day series never lands on a weekend", () => {
    const data = generateBusinessDayOhlcv(40, { seed: 3, startMs: Date.UTC(2024, 0, 6) });
    for (const ts of data.x) {
      const day = new Date(ts).getUTCDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });

  it("supports the legacy positional (startMs, seed) signature", () => {
    const start = Date.UTC(2024, 2, 1);
    const a = generateBusinessDayOhlcv(10, start, 99);
    const b = generateBusinessDayOhlcv(10, start, 99);
    expect(Array.from(a.close)).toEqual(Array.from(b.close));
  });

  it("generateContinuousOhlcv produces consecutive calendar days", () => {
    const start = Date.UTC(2024, 0, 1);
    const data = generateContinuousOhlcv(15, { seed: 11, startMs: start });
    expect(data.x).toHaveLength(15);
    for (let i = 0; i < data.x.length; i++) {
      expect(data.x[i]).toBe(start + i * MS_DAY);
    }
    // deterministic with the same seed
    const again = generateContinuousOhlcv(15, { seed: 11, startMs: start });
    expect(Array.from(data.close)).toEqual(Array.from(again.close));
  });

  it("generateContinuousOhlcv supports positional args and defaults", () => {
    const data = generateContinuousOhlcv(5, Date.UTC(2024, 5, 1), 5);
    expect(data.volume).toHaveLength(5);
    // defaults (no seed → Math.random path) should still yield valid OHLC
    const rnd = generateContinuousOhlcv(5);
    for (let i = 0; i < 5; i++) {
      expect(rnd.high[i]).toBeGreaterThanOrEqual(rnd.low[i]);
    }
  });

  it("generateBusinessDayOhlcv without a seed uses the random path", () => {
    const data = generateBusinessDayOhlcv(5);
    expect(data.x).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      expect(data.high[i]).toBeGreaterThanOrEqual(data.low[i]);
    }
  });
});
