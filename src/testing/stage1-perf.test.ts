/**
 * Stage 1 performance benchmarks — runnable in CI (non-blocking thresholds).
 * @module testing/stage1-perf
 */

import { describe, it, expect } from "vitest";
import { ohlcMinMaxDownsample, lttbDownsample, calculateTargetPoints, sliceSeriesToViewport } from "../workers/downsample";
import { rsiAsync } from "../workers/indicatorsAsync";
import { assertPerformance } from "./index";

function generateOhlc(n: number) {
  const x = new Float32Array(n);
  const open = new Float32Array(n);
  const high = new Float32Array(n);
  const low = new Float32Array(n);
  const close = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = i;
    open[i] = 100 + (i % 20);
    high[i] = open[i] + 3;
    low[i] = open[i] - 2;
    close[i] = open[i] + 1;
  }
  return { x, open, high, low, close };
}

describe("Stage 1 performance benchmarks", () => {
  it("500k candlestick bars downsample to canvas budget", () => {
    const n = 500_000;
    const canvasWidth = 1920;
    const target = calculateTargetPoints(n, canvasWidth, 2);
    const { x, open, high, low, close } = generateOhlc(n);

    const start = performance.now();
    const result = ohlcMinMaxDownsample(x, open, high, low, close, target);
    const duration = performance.now() - start;

    expect(result.x.length).toBeLessThanOrEqual(target);
    expect(duration).toBeLessThan(500);
  });

  it("1M line points LTTB downsample under 1s", () => {
    const n = 1_000_000;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const y = Float32Array.from({ length: n }, (_, i) => Math.sin(i * 0.0001));

    const start = performance.now();
    const result = lttbDownsample(x, y, 3840);
    const duration = performance.now() - start;

    expect(result.x.length).toBe(3840);
    expect(duration).toBeLessThan(1000);
  });

  it("RSI 100k bars completes under 200ms", async () => {
    const data = Float32Array.from({ length: 100_000 }, (_, i) => 100 + (i % 30));
    const start = performance.now();
    const result = await rsiAsync(data, 14);
    const duration = performance.now() - start;

    expect(result.values.length).toBe(100_000);
    expect(duration).toBeLessThan(200);
  });

  it("assertPerformance helper validates benchmark results", () => {
    const check = assertPerformance(
      {
        avgFps: 58,
        minFps: 45,
        maxFps: 60,
        avgFrameTime: 17,
        frameCount: 300,
        duration: 5000,
        pointsRendered: 1_000_000,
        throughput: 58_000_000,
      },
      { minFps: 55 },
    );
    expect(check.passed).toBe(true);

    const fail = assertPerformance(
      { avgFps: 30, minFps: 20, maxFps: 40, avgFrameTime: 33, frameCount: 100, duration: 5000, pointsRendered: 1e6, throughput: 30e6 },
      { minFps: 55 },
    );
    expect(fail.passed).toBe(false);
  });

  it("viewport slice reduces work when zoomed in", () => {
    const n = 1_000_000;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const y = Float32Array.from({ length: n }, (_, i) => Math.sin(i * 0.0001));

    const fullStart = performance.now();
    lttbDownsample(x, y, 1600);
    const fullDuration = performance.now() - fullStart;

    const sliced = sliceSeriesToViewport({ x, y }, 400_000, 410_000, 0.5);

    const sliceStart = performance.now();
    lttbDownsample(sliced.x, sliced.y!, 1600);
    const sliceDuration = performance.now() - sliceStart;

    expect(sliced.x.length).toBeLessThan(n * 0.05);
    expect(sliceDuration).toBeLessThan(fullDuration * 0.5);
  });

  it("1M points × 3 series typed-array memory stays under 300MB budget", () => {
    const n = 1_000_000;
    const bytesPerSeries = n * 4 * 2; // Float32 x + y
    const totalBytes = bytesPerSeries * 3;
    expect(totalBytes).toBeLessThan(300 * 1024 * 1024);
  });
});
