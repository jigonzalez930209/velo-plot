/**
 * Async indicator API backed by a shared worker pool.
 * Falls back to synchronous calculation when Workers are unavailable.
 * @module workers/indicatorsAsync
 */

import type { IndicatorResult } from "../plugins/analysis/indicators";
import { rsi, macd, bollingerBands, sma, ema } from "../plugins/analysis/indicators";
import { WorkerPool, nextTaskId } from "./pool";

type IndicatorName = "rsi" | "macd" | "bollingerBands" | "sma" | "ema";

interface IndicatorTaskPayload {
  id: string;
  type: "indicator";
  indicator: IndicatorName;
  data: Float32Array | Float64Array;
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDev?: number;
}

interface IndicatorTaskResult extends IndicatorResult {
  id: string;
  type: "indicator-result";
  indicator: string;
  duration: number;
}

let pool: WorkerPool<IndicatorTaskPayload, IndicatorTaskResult> | null = null;

function getPool(): WorkerPool<IndicatorTaskPayload, IndicatorTaskResult> {
  if (!pool) {
    pool = new WorkerPool<IndicatorTaskPayload, IndicatorTaskResult>(
      () => new Worker(new URL("./indicator.worker.ts", import.meta.url), { type: "module" }),
      {
        poolSize: 2,
        syncFallback: true,
        syncHandler(task) {
          const start = performance.now();
          switch (task.indicator) {
            case "rsi":
              return {
                id: task.id,
                type: "indicator-result",
                indicator: "rsi",
                values: rsi(task.data, task.period ?? 14),
                duration: performance.now() - start,
              };
            case "sma":
              return {
                id: task.id,
                type: "indicator-result",
                indicator: "sma",
                values: sma(task.data, task.period ?? 14),
                duration: performance.now() - start,
              };
            case "ema":
              return {
                id: task.id,
                type: "indicator-result",
                indicator: "ema",
                values: ema(task.data, task.period ?? 14),
                duration: performance.now() - start,
              };
            case "macd": {
              const result = macd(
                task.data,
                task.fastPeriod ?? 12,
                task.slowPeriod ?? 26,
                task.signalPeriod ?? 9,
              );
              return {
                id: task.id,
                type: "indicator-result",
                indicator: "macd",
                ...result,
                duration: performance.now() - start,
              };
            }
            case "bollingerBands": {
              const result = bollingerBands(task.data, task.period ?? 20, task.stdDev ?? 2);
              return {
                id: task.id,
                type: "indicator-result",
                indicator: "bollingerBands",
                ...result,
                duration: performance.now() - start,
              };
            }
            default:
              throw new Error(`Unknown indicator: ${task.indicator}`);
          }
        },
      },
    );
  }
  return pool;
}

function toTypedArray(data: Float32Array | Float64Array | number[]): Float32Array | Float64Array {
  if (data instanceof Float32Array || data instanceof Float64Array) return data;
  return Float32Array.from(data);
}

async function runIndicator(task: Omit<IndicatorTaskPayload, "id" | "type">): Promise<IndicatorResult & { duration: number }> {
  const id = nextTaskId(task.indicator);
  const result = await getPool().run({ id, type: "indicator", ...task });
  return {
    values: result.values,
    signal: result.signal,
    upper: result.upper,
    lower: result.lower,
    histogram: result.histogram,
    duration: result.duration,
  };
}

/** Async RSI — non-blocking for large datasets */
export async function rsiAsync(
  data: Float32Array | Float64Array | number[],
  period = 14,
): Promise<IndicatorResult & { duration: number }> {
  return runIndicator({ indicator: "rsi", data: toTypedArray(data), period });
}

/** Async SMA */
export async function smaAsync(
  data: Float32Array | Float64Array | number[],
  period = 14,
): Promise<IndicatorResult & { duration: number }> {
  return runIndicator({ indicator: "sma", data: toTypedArray(data), period });
}

/** Async EMA */
export async function emaAsync(
  data: Float32Array | Float64Array | number[],
  period = 14,
): Promise<IndicatorResult & { duration: number }> {
  return runIndicator({ indicator: "ema", data: toTypedArray(data), period });
}

/** Async MACD */
export async function macdAsync(
  data: Float32Array | Float64Array | number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): Promise<IndicatorResult & { duration: number }> {
  return runIndicator({
    indicator: "macd",
    data: toTypedArray(data),
    fastPeriod,
    slowPeriod,
    signalPeriod,
  });
}

/** Async Bollinger Bands */
export async function bollingerBandsAsync(
  data: Float32Array | Float64Array | number[],
  period = 20,
  stdDev = 2,
): Promise<IndicatorResult & { duration: number }> {
  return runIndicator({ indicator: "bollingerBands", data: toTypedArray(data), period, stdDev });
}

/** Destroy the shared indicator worker pool (for tests) */
export function destroyIndicatorPool(): void {
  pool?.destroy();
  pool = null;
}

/** Exposed for tests */
export function getIndicatorPoolSize(): number {
  return getPool().size();
}
