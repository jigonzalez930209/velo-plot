import { describe, it, expect, afterEach } from "vitest";
import { rsi, sma, ema } from "../plugins/analysis/indicators";
import {
  rsiAsync,
  smaAsync,
  emaAsync,
  macdAsync,
  bollingerBandsAsync,
  destroyIndicatorPool,
} from "./indicatorsAsync";

describe("indicatorsAsync", () => {
  afterEach(() => {
    destroyIndicatorPool();
  });

  const sample = Float32Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i * 0.1) * 5);

  it("rsiAsync matches sync rsi (sync fallback in node)", async () => {
    const asyncResult = await rsiAsync(sample, 14);
    const syncResult = rsi(sample, 14);
    expect(asyncResult.values.length).toBe(syncResult.length);
    expect(asyncResult.values[50]).toBeCloseTo(syncResult[50], 4);
    expect(asyncResult.duration).toBeGreaterThanOrEqual(0);
  });

  it("smaAsync matches sync sma", async () => {
    const asyncResult = await smaAsync(sample, 10);
    const syncResult = sma(sample, 10);
    expect(asyncResult.values[30]).toBeCloseTo(syncResult[30], 4);
  });

  it("emaAsync matches sync ema", async () => {
    const asyncResult = await emaAsync(sample, 10);
    const syncResult = ema(sample, 10);
    expect(asyncResult.values[30]).toBeCloseTo(syncResult[30], 4);
  });

  it("macdAsync returns signal and histogram", async () => {
    const result = await macdAsync(sample);
    expect(result.values.length).toBe(sample.length);
    expect(result.signal?.length).toBe(sample.length);
    expect(result.histogram?.length).toBe(sample.length);
  });

  it("bollingerBandsAsync returns upper and lower bands", async () => {
    const result = await bollingerBandsAsync(sample, 20, 2);
    expect(result.upper?.length).toBe(sample.length);
    expect(result.lower?.length).toBe(sample.length);
    expect(result.upper![50]).toBeGreaterThan(result.lower![50]!);
  });

  it("completes RSI for 100k points within 200ms (sync fallback)", async () => {
    const large = Float32Array.from({ length: 100_000 }, (_, i) => 100 + (i % 50));
    const start = performance.now();
    await rsiAsync(large, 14);
    expect(performance.now() - start).toBeLessThan(200);
  });
});
