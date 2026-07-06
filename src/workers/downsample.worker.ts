/**
 * Downsampling Web Worker
 *
 * Performs CPU-intensive downsampling off the main thread.
 *
 * Usage:
 * ```typescript
 * const worker = new Worker(new URL('./downsample.worker.ts', import.meta.url));
 *
 * worker.postMessage({
 *   type: 'downsample',
 *   x: xArray,
 *   y: yArray,
 *   targetPoints: 1000,
 *   algorithm: 'lttb'
 * });
 *
 * worker.onmessage = (e) => {
 *   const { x, y, indices } = e.data;
 *   chart.setDownsampledData(x, y);
 * };
 * ```
 */

import {
  lttbDownsample,
  minMaxDownsample,
  ohlcMinMaxDownsample,
  type DownsampleResult,
} from './downsample';

// ============================================
// Message Types
// ============================================

interface DownsampleRequestMessage {
  type: 'downsample';
  id?: string;
  x: Float32Array | Float64Array;
  y: Float32Array | Float64Array;
  targetPoints: number;
  algorithm?: 'lttb' | 'minmax';
}

interface DownsampleResponseMessage {
  type: 'downsample-result';
  id?: string;
  x: Float32Array;
  y: Float32Array;
  indices: Uint32Array;
  originalLength: number;
  duration: number;
}

interface ErrorMessage {
  type: 'error';
  id?: string;
  error: string;
}

interface OhlcDownsampleRequestMessage {
  type: 'ohlc-downsample';
  id?: string;
  x: Float32Array | Float64Array;
  open: Float32Array | Float64Array;
  high: Float32Array | Float64Array;
  low: Float32Array | Float64Array;
  close: Float32Array | Float64Array;
  targetBars: number;
}

interface OhlcDownsampleResponseMessage {
  type: 'ohlc-downsample-result';
  id?: string;
  x: Float32Array;
  open: Float32Array;
  high: Float32Array;
  low: Float32Array;
  close: Float32Array;
  indices: Uint32Array;
  originalLength: number;
  duration: number;
}

type WorkerMessage = DownsampleRequestMessage | OhlcDownsampleRequestMessage;

// ============================================
// Worker Logic
// ============================================

self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  const message = e.data;

  try {
    if (message.type === 'downsample') {
      const start = performance.now();

      const { x, y, targetPoints, algorithm = 'lttb', id } = message;

      let result: DownsampleResult;

      if (algorithm === 'minmax') {
        // Min-max uses bucket count, not target points
        const bucketCount = Math.ceil(targetPoints / 2);
        result = minMaxDownsample(x, y, bucketCount);
      } else {
        result = lttbDownsample(x, y, targetPoints);
      }

      const duration = performance.now() - start;

      const response: DownsampleResponseMessage = {
        type: 'downsample-result',
        id,
        x: result.x,
        y: result.y,
        indices: result.indices,
        originalLength: x.length,
        duration,
      };

      // Transfer ownership of buffers for zero-copy
      (self.postMessage as (message: unknown, transfer: Transferable[]) => void)(
        response,
        [result.x.buffer, result.y.buffer, result.indices.buffer]
      );
    } else if (message.type === 'ohlc-downsample') {
      const start = performance.now();
      const { x, open, high, low, close, targetBars, id } = message;

      const result = ohlcMinMaxDownsample(x, open, high, low, close, targetBars);
      const duration = performance.now() - start;

      const response: OhlcDownsampleResponseMessage = {
        type: 'ohlc-downsample-result',
        id,
        x: result.x,
        open: result.open,
        high: result.high,
        low: result.low,
        close: result.close,
        indices: result.indices,
        originalLength: x.length,
        duration,
      };

      (self.postMessage as (message: unknown, transfer: Transferable[]) => void)(
        response,
        [
          result.x.buffer,
          result.open.buffer,
          result.high.buffer,
          result.low.buffer,
          result.close.buffer,
          result.indices.buffer,
        ]
      );
    }
  } catch (error) {
    const errorResponse: ErrorMessage = {
      type: 'error',
      id: (message as DownsampleRequestMessage).id,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(errorResponse);
  }
};

// Export types for TypeScript
export type { DownsampleRequestMessage, DownsampleResponseMessage, ErrorMessage };
