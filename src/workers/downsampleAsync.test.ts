import { describe, it, expect, afterEach } from "vitest";
import {
  downsampleAsync,
  ohlcDownsampleAsync,
  destroyDownsamplePool,
  getDownsamplePoolSize,
} from "./downsampleAsync";

describe("downsampleAsync", () => {
  afterEach(() => {
    destroyDownsamplePool();
  });

  it("downsamples via sync fallback in Node", async () => {
    const n = 10_000;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const y = Float32Array.from({ length: n }, (_, i) => Math.sin(i * 0.01));
    const result = await downsampleAsync(x, y, 100, "lttb");
    expect(result.x.length).toBe(100);
    expect(result.x[0]).toBe(0);
    expect(result.x[result.x.length - 1]).toBe(n - 1);
  });

  it("downsamples with minmax algorithm", async () => {
    const n = 5000;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const y = Float32Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 10 : -10));
    const result = await downsampleAsync(x, y, 80, "minmax");
    expect(result.x.length).toBeGreaterThan(0);
    expect(result.x.length).toBeLessThanOrEqual(80);
  });

  it("ohlcDownsampleAsync reduces OHLC series", async () => {
    const n = 8000;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const open = Float32Array.from({ length: n }, (_, i) => 100 + (i % 5));
    const high = Float32Array.from({ length: n }, (_, i) => open[i] + 2);
    const low = Float32Array.from({ length: n }, (_, i) => open[i] - 2);
    const close = Float32Array.from({ length: n }, (_, i) => open[i] + 1);
    const result = await ohlcDownsampleAsync(x, open, high, low, close, 120);
    expect(result.x.length).toBeLessThanOrEqual(120);
    expect(result.open.length).toBe(result.x.length);
    expect(result.high.length).toBe(result.x.length);
  });

  it("reuses pool and reports size", async () => {
    const x = Float32Array.from([0, 1, 2, 3]);
    const y = Float32Array.from([1, 2, 3, 4]);
    await downsampleAsync(x, y, 4);
    expect(getDownsamplePoolSize()).toBe(0);
  });
});
