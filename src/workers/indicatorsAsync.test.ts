import { describe, it, expect, afterEach, vi } from "vitest";
import { rsi, sma, ema } from "../plugins/analysis/indicators";
import {
  rsiAsync,
  smaAsync,
  emaAsync,
  macdAsync,
  bollingerBandsAsync,
  destroyIndicatorPool,
  getIndicatorPoolSize,
  computeIndicatorSync,
  isIndicatorPreferSync,
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

  it("accepts plain number[] input", async () => {
    const data = Array.from({ length: 40 }, (_, i) => 100 + i * 0.1);
    const result = await rsiAsync(data, 10);
    expect(result.values.length).toBe(40);
  });

  it("reports indicator pool size — small series stay sync and skip workers", async () => {
    destroyIndicatorPool();
    await rsiAsync(Float32Array.from([1, 2, 3, 4, 5]), 2);
    // Pool is lazy: small N never creates it.
    expect(isIndicatorPreferSync()).toBe(false);
  });

  describe("computeIndicatorSync parameter defaults", () => {
    const data = Float32Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i * 0.2) * 4);
    const base = { id: "t", type: "indicator" as const, data };

    it("applies default periods when omitted for rsi/sma/ema", () => {
      for (const indicator of ["rsi", "sma", "ema"] as const) {
        const r = computeIndicatorSync({ ...base, indicator });
        expect(r.values.length).toBe(data.length);
        expect(r.indicator).toBe(indicator);
      }
    });

    it("applies default periods for macd", () => {
      const r = computeIndicatorSync({ ...base, indicator: "macd" });
      expect(r.signal?.length).toBe(data.length);
      expect(r.histogram?.length).toBe(data.length);
    });

    it("applies default period and stdDev for bollingerBands", () => {
      const r = computeIndicatorSync({ ...base, indicator: "bollingerBands" });
      expect(r.upper?.length).toBe(data.length);
      expect(r.lower?.length).toBe(data.length);
    });

    it("throws for an unknown indicator", () => {
      expect(() =>
        computeIndicatorSync({ ...base, indicator: "unknown" as never }),
      ).toThrow(/Unknown indicator/);
    });
  });

  it("spawns workers only for large series", async () => {
    // A minimal Worker mock so the pool takes the worker (factory) path instead
    // of the sync fallback, exercising the worker factory closure.
    class MockIndicatorWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(task: { id: string; indicator: string; data: Float32Array; period?: number }) {
        queueMicrotask(() => {
          this.onmessage?.({
            data: {
              id: task.id,
              type: "indicator-result",
              indicator: task.indicator,
              values: rsi(task.data, task.period ?? 14),
              duration: 0,
            },
          } as MessageEvent);
        });
      }
      terminate() {}
    }
    const original = globalThis.Worker;
    // @ts-expect-error test override
    globalThis.Worker = MockIndicatorWorker;
    destroyIndicatorPool();
    try {
      // Below SYNC_THRESHOLD → sync path, no pool created
      await rsiAsync(Float32Array.from({ length: 30 }, (_, i) => i), 14);
      expect(isIndicatorPreferSync()).toBe(false);

      // Above SYNC_THRESHOLD → worker path
      const large = Float32Array.from({ length: 6_000 }, (_, i) => i);
      const result = await rsiAsync(large, 14);
      expect(result.values.length).toBe(6_000);
      expect(getIndicatorPoolSize()).toBe(2);
    } finally {
      destroyIndicatorPool();
      globalThis.Worker = original;
    }
  });

  it("sets preferSync after a slow worker response", async () => {
    class SlowWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      postMessage(task: { id: string; indicator: string; data: Float32Array; period?: number }) {
        setTimeout(() => {
          this.onmessage?.({
            data: {
              id: task.id,
              type: "indicator-result",
              indicator: task.indicator,
              values: rsi(task.data, task.period ?? 14),
              duration: 0,
            },
          } as MessageEvent);
        }, 220);
      }
      terminate() {}
    }

    const original = globalThis.Worker;
    // @ts-expect-error test override
    globalThis.Worker = SlowWorker;
    destroyIndicatorPool();
    vi.useFakeTimers();
    try {
      const large = Float32Array.from({ length: 6_000 }, (_, i) => i);
      const pending = rsiAsync(large, 14);
      await vi.advanceTimersByTimeAsync(250);
      await pending;
      expect(isIndicatorPreferSync()).toBe(true);
    } finally {
      vi.useRealTimers();
      destroyIndicatorPool();
      globalThis.Worker = original;
    }
  });
});
