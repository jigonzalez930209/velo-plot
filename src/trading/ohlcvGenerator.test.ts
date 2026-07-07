import { describe, it, expect } from "vitest";
import {
  generateBusinessDayOhlcv,
  findLowestBarIndex,
  findHighestBarIndex,
} from "./ohlcvGenerator";

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
});
