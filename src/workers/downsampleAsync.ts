/**
 * Async downsampling via shared worker pool (main-thread fallback in Node/tests).
 * @module workers/downsampleAsync
 */

import {
  lttbDownsample,
  minMaxDownsample,
  ohlcMinMaxDownsample,
  type OhlcDownsampleResult,
  type DownsampleResult,
} from "./downsample";
import { WorkerPool, nextTaskId } from "./pool";

type DownsampleTask = {
  id: string;
  type: "downsample";
  x: Float32Array;
  y: Float32Array;
  targetPoints: number;
  algorithm: "lttb" | "minmax";
};

type OhlcDownsampleTask = {
  id: string;
  type: "ohlc-downsample";
  x: Float32Array;
  open: Float32Array;
  high: Float32Array;
  low: Float32Array;
  close: Float32Array;
  targetBars: number;
};

type DownsampleWorkerResult =
  | {
      id: string;
      type: "downsample-result";
      x: Float32Array;
      y: Float32Array;
    }
  | {
      id: string;
      type: "ohlc-downsample-result";
      x: Float32Array;
      open: Float32Array;
      high: Float32Array;
      low: Float32Array;
      close: Float32Array;
    }
  | { id: string; type: "error"; error: string };

let pool: WorkerPool<DownsampleTask | OhlcDownsampleTask, DownsampleWorkerResult> | null = null;

function getPool() {
  if (pool) return pool;

  pool = new WorkerPool<DownsampleTask | OhlcDownsampleTask, DownsampleWorkerResult>(
    () => new Worker(new URL("./downsample.worker.ts", import.meta.url), { type: "module" }),
    {
      poolSize: 2,
      syncFallback: true,
      syncHandler: (task) => {
        if (task.type === "downsample") {
          const result =
            task.algorithm === "minmax"
              ? minMaxDownsample(task.x, task.y, Math.ceil(task.targetPoints / 2))
              : lttbDownsample(task.x, task.y, task.targetPoints);
          return { id: task.id, type: "downsample-result", x: result.x, y: result.y };
        }

        const result = ohlcMinMaxDownsample(
          task.x,
          task.open,
          task.high,
          task.low,
          task.close,
          task.targetBars,
        );
        return {
          id: task.id,
          type: "ohlc-downsample-result",
          x: result.x,
          open: result.open,
          high: result.high,
          low: result.low,
          close: result.close,
        };
      },
    },
  );

  return pool;
}

export async function downsampleAsync(
  x: Float32Array,
  y: Float32Array,
  targetPoints: number,
  algorithm: "lttb" | "minmax" = "lttb",
): Promise<DownsampleResult> {
  const id = nextTaskId("downsample");
  const result = await getPool().run({
    id,
    type: "downsample",
    x,
    y,
    targetPoints,
    algorithm,
  });

  if (result.type === "error") throw new Error(result.error);
  if (result.type !== "downsample-result") {
    throw new Error("Unexpected downsample worker response");
  }

  return {
    x: result.x,
    y: result.y,
    indices: new Uint32Array(result.x.length),
  };
}

export async function ohlcDownsampleAsync(
  x: Float32Array,
  open: Float32Array,
  high: Float32Array,
  low: Float32Array,
  close: Float32Array,
  targetBars: number,
): Promise<OhlcDownsampleResult> {
  const id = nextTaskId("ohlc-downsample");
  const result = await getPool().run({
    id,
    type: "ohlc-downsample",
    x,
    open,
    high,
    low,
    close,
    targetBars,
  });

  if (result.type === "error") throw new Error(result.error);
  if (result.type !== "ohlc-downsample-result") {
    throw new Error("Unexpected OHLC downsample worker response");
  }

  return {
    x: result.x,
    open: result.open,
    high: result.high,
    low: result.low,
    close: result.close,
    indices: new Uint32Array(result.x.length),
  };
}

export function destroyDownsamplePool(): void {
  pool?.destroy();
  pool = null;
}

export function getDownsamplePoolSize(): number {
  return pool?.size() ?? 0;
}
