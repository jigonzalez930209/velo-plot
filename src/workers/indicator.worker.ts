/**
 * Indicator calculations in a Web Worker.
 * @module workers/indicator.worker
 */

import { rsi, macd, bollingerBands, sma, ema } from "../plugins/analysis/indicators";

interface IndicatorTask {
  id: string;
  type: "indicator";
  indicator: "rsi" | "macd" | "bollingerBands" | "sma" | "ema";
  data: Float32Array | Float64Array;
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDev?: number;
}

interface IndicatorResultMessage {
  id: string;
  type: "indicator-result";
  indicator: string;
  values: Float32Array;
  signal?: Float32Array;
  upper?: Float32Array;
  lower?: Float32Array;
  histogram?: Float32Array;
  duration: number;
}

interface ErrorMessage {
  id: string;
  type: "error";
  error: string;
}

self.onmessage = function (event: MessageEvent<IndicatorTask>) {
  const message = event.data;

  try {
    const start = performance.now();
    let response: IndicatorResultMessage;

    switch (message.indicator) {
      case "rsi": {
        const values = rsi(message.data, message.period ?? 14);
        response = {
          id: message.id,
          type: "indicator-result",
          indicator: "rsi",
          values,
          duration: performance.now() - start,
        };
        (self.postMessage as (msg: unknown, transfer: Transferable[]) => void)(response, [values.buffer]);
        return;
      }
      case "sma": {
        const values = sma(message.data, message.period ?? 14);
        response = {
          id: message.id,
          type: "indicator-result",
          indicator: "sma",
          values,
          duration: performance.now() - start,
        };
        (self.postMessage as (msg: unknown, transfer: Transferable[]) => void)(response, [values.buffer]);
        return;
      }
      case "ema": {
        const values = ema(message.data, message.period ?? 14);
        response = {
          id: message.id,
          type: "indicator-result",
          indicator: "ema",
          values,
          duration: performance.now() - start,
        };
        (self.postMessage as (msg: unknown, transfer: Transferable[]) => void)(response, [values.buffer]);
        return;
      }
      case "macd": {
        const result = macd(
          message.data,
          message.fastPeriod ?? 12,
          message.slowPeriod ?? 26,
          message.signalPeriod ?? 9,
        );
        response = {
          id: message.id,
          type: "indicator-result",
          indicator: "macd",
          values: result.values,
          signal: result.signal,
          histogram: result.histogram,
          duration: performance.now() - start,
        };
        const transfer: Transferable[] = [result.values.buffer];
        if (result.signal) transfer.push(result.signal.buffer);
        if (result.histogram) transfer.push(result.histogram.buffer);
        (self.postMessage as (msg: unknown, transfer: Transferable[]) => void)(response, transfer);
        return;
      }
      case "bollingerBands": {
        const result = bollingerBands(message.data, message.period ?? 20, message.stdDev ?? 2);
        response = {
          id: message.id,
          type: "indicator-result",
          indicator: "bollingerBands",
          values: result.values,
          upper: result.upper,
          lower: result.lower,
          duration: performance.now() - start,
        };
        const transfer: Transferable[] = [result.values.buffer];
        if (result.upper) transfer.push(result.upper.buffer);
        if (result.lower) transfer.push(result.lower.buffer);
        (self.postMessage as (msg: unknown, transfer: Transferable[]) => void)(response, transfer);
        return;
      }
      default: {
        const err: ErrorMessage = {
          id: message.id,
          type: "error",
          error: `Unknown indicator: ${(message as IndicatorTask).indicator}`,
        };
        self.postMessage(err);
      }
    }
  } catch (error) {
    const err: ErrorMessage = {
      id: message.id,
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(err);
  }
};

export type { IndicatorTask, IndicatorResultMessage, ErrorMessage };
