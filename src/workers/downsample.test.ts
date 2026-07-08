import { describe, it, expect } from "vitest";
import {
  lttbDownsample,
  minMaxDownsample,
  ohlcMinMaxDownsample,
  calculateTargetPoints,
  sliceSeriesToViewport,
  lowerBoundX,
  upperBoundX,
} from "./downsample";

describe("downsample", () => {
  it("lttbDownsample preserves first and last points", () => {
    const n = 1000;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const y = Float32Array.from({ length: n }, (_, i) => Math.sin(i * 0.1));
    const result = lttbDownsample(x, y, 50);
    expect(result.x.length).toBe(50);
    expect(result.x[0]).toBe(0);
    expect(result.x[result.x.length - 1]).toBe(n - 1);
  });

  it("minMaxDownsample preserves bucket extremes", () => {
    const x = Float32Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
    const y = Float32Array.from([1, 9, 2, 8, 3, 7, 4, 6]);
    const result = minMaxDownsample(x, y, 2);
    expect(result.y).toContain(9);
    expect(result.y).toContain(1);
  });

  it("ohlcMinMaxDownsample aggregates OHLC buckets", () => {
    const n = 100;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const open = Float32Array.from({ length: n }, (_, i) => i);
    const high = Float32Array.from({ length: n }, (_, i) => i + 2);
    const low = Float32Array.from({ length: n }, (_, i) => i - 1);
    const close = Float32Array.from({ length: n }, (_, i) => i + 1);

    const result = ohlcMinMaxDownsample(x, open, high, low, close, 10);
    expect(result.x.length).toBe(10);
    expect(result.high[0]).toBeGreaterThanOrEqual(result.low[0]);
    expect(result.open[0]).toBe(0);
    expect(result.close[result.close.length - 1]).toBe(100);
  });

  it("calculateTargetPoints caps by canvas width", () => {
    expect(calculateTargetPoints(1_000_000, 800, 2)).toBe(1600);
    expect(calculateTargetPoints(100, 800, 2)).toBe(100);
  });

  it("sliceSeriesToViewport returns padded visible range", () => {
    const n = 1000;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const y = Float32Array.from({ length: n }, (_, i) => i);
    const sliced = sliceSeriesToViewport({ x, y }, 400, 600, 0.1);
    expect(sliced.start).toBeLessThan(400);
    expect(sliced.end).toBeGreaterThan(600);
    expect(sliced.x.length).toBe(sliced.end - sliced.start);
  });

  it("lowerBoundX and upperBoundX bracket values", () => {
    const x = Float32Array.from([0, 10, 20, 30, 40]);
    expect(lowerBoundX(x, 10)).toBe(1);
    expect(upperBoundX(x, 30)).toBe(4);
  });

  it("minMaxDownsample returns a copy when the bucket count is large", () => {
    const x = Float32Array.from([0, 1, 2, 3]);
    const y = Float32Array.from([5, 6, 7, 8]);
    // bucketCount >= length / 2 → identity copy
    const result = minMaxDownsample(x, y, 4);
    expect(Array.from(result.x)).toEqual([0, 1, 2, 3]);
    expect(Array.from(result.indices)).toEqual([0, 1, 2, 3]);
  });

  it("ohlcMinMaxDownsample returns a copy when target >= length", () => {
    const x = Float32Array.from([0, 1, 2]);
    const o = Float32Array.from([1, 2, 3]);
    const result = ohlcMinMaxDownsample(x, o, o, o, o, 10);
    expect(result.x.length).toBe(3);
    expect(Array.from(result.indices)).toEqual([0, 1, 2]);
  });

  it("ohlcMinMaxDownsample skips empty buckets for sparse targets", () => {
    // A large target relative to length forces some empty buckets (start>=end).
    const n = 5;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const o = Float32Array.from({ length: n }, (_, i) => 100 + i);
    const result = ohlcMinMaxDownsample(x, o, o, o, o, 4);
    expect(result.x.length).toBeGreaterThan(0);
    expect(result.x.length).toBeLessThanOrEqual(4);
  });

  it("sliceSeriesToViewport handles an empty series", () => {
    const empty = sliceSeriesToViewport({ x: new Float32Array(0) }, 0, 10);
    expect(empty.x.length).toBe(0);
    expect(empty.start).toBe(0);
    expect(empty.end).toBe(0);
  });
});
