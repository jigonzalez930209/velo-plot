/**
 * Trading indicator presets — compute IndicatorData from OHLC/price series.
 * Stage 2: high-level indicator API (RSI, MACD, Bollinger, EMA, SMA).
 */

import type { IndicatorData } from "./types";
import {
  rsiAsync,
  macdAsync,
  bollingerBandsAsync,
  emaAsync,
  smaAsync,
} from "../../workers/indicatorsAsync";
import { stochastic } from "../../plugins/analysis/indicators";
import type { Series } from "../Series";

export type IndicatorPresetName =
  | "rsi"
  | "macd"
  | "bollinger"
  | "bollingerBands"
  | "ema"
  | "sma"
  | "stochastic";

export interface IndicatorPresetOptions {
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDev?: number;
  /** Root id for generated series (default: preset name) */
  id?: string;
  label?: string;
}

export interface ComputedIndicatorPreset {
  id: string;
  preset: IndicatorPresetName;
  /** overlay = price chart bands/lines; oscillator = separate pane layers */
  placement: "overlay" | "oscillator";
  yRange?: [number, number];
  data: IndicatorData;
}

const OVERLAY_PRESETS = new Set<IndicatorPresetName>([
  "bollinger",
  "bollingerBands",
  "ema",
  "sma",
]);

function normalizePreset(name: IndicatorPresetName): Exclude<IndicatorPresetName, "bollingerBands"> | "bollinger" {
  return name === "bollingerBands" ? "bollinger" : name;
}

/** Extract X and close/price array from a source series. */
export function extractPriceSeries(source: Series): {
  x: Float32Array | Float64Array;
  prices: Float32Array | Float64Array;
} {
  const data = source.getData();
  const x = data.x;
  if (!x?.length) {
    throw new Error("[addIndicator] Source series has no X data");
  }

  const type = source.getType();
  let prices: Float32Array | Float64Array | undefined;
  if (type === "candlestick") {
    prices = data.close ?? data.y;
  } else {
    prices = data.y;
  }

  if (!prices?.length) {
    throw new Error("[addIndicator] Source series has no price/Y data");
  }
  return { x, prices };
}

/** Extract OHLC from candlestick series for stochastic and similar presets. */
export function extractOhlcSeries(source: Series): {
  x: Float32Array | Float64Array;
  open: Float32Array | Float64Array;
  high: Float32Array | Float64Array;
  low: Float32Array | Float64Array;
  close: Float32Array | Float64Array;
} {
  const data = source.getData();
  const x = data.x;
  if (!x?.length) {
    throw new Error("[addIndicator] Source series has no X data");
  }
  const open = data.open ?? data.y;
  const high = data.high ?? data.y;
  const low = data.low ?? data.y;
  const close = data.close ?? data.y;
  if (!open?.length || !high?.length || !low?.length || !close?.length) {
    throw new Error("[addIndicator] Source series has no OHLC data — use candlestick");
  }
  return { x, open, high, low, close };
}

/** Resolve source series from chart API surface. */
export function resolveSourceSeries(
  chart: { getSeries(id: string): Series | undefined; getAllSeries(): Series[] },
  sourceSeriesId?: string,
): Series {
  if (sourceSeriesId) {
    const s = chart.getSeries(sourceSeriesId);
    if (!s) throw new Error(`[addIndicator] Source series "${sourceSeriesId}" not found`);
    return s;
  }

  const all = chart.getAllSeries();
  const preferred = all.find((s) => {
    const t = s.getType();
    return t === "candlestick" || t === "line" || t === "bar";
  });
  if (!preferred) {
    throw new Error("[addIndicator] No line/candlestick/bar series found — pass sourceSeriesId");
  }
  return preferred;
}

/**
 * Compute composite indicator layers for a preset (async worker path when available).
 */
export async function computeIndicatorPreset(
  preset: IndicatorPresetName,
  x: Float32Array | Float64Array,
  prices: Float32Array | Float64Array,
  options: IndicatorPresetOptions = {},
  source?: Series,
): Promise<ComputedIndicatorPreset> {
  const kind = normalizePreset(preset);
  const id = options.id ?? kind;
  const xArr = x instanceof Float32Array || x instanceof Float64Array ? x : Float32Array.from(x);

  switch (kind) {
    case "rsi": {
      const period = options.period ?? 14;
      const { values } = await rsiAsync(prices, period);
      return {
        id,
        preset: "rsi",
        placement: "oscillator",
        yRange: [0, 100],
        data: {
          x: xArr,
          lines: [{ id: "rsi", y: values, color: "#ab47bc", width: 1.5 }],
          referenceLines: [
            { y: 70, color: "rgba(239, 83, 80, 0.5)", dash: [4, 4] },
            { y: 30, color: "rgba(38, 166, 154, 0.5)", dash: [4, 4] },
          ],
        },
      };
    }

    case "macd": {
      const fast = options.fastPeriod ?? 12;
      const slow = options.slowPeriod ?? 26;
      const signal = options.signalPeriod ?? 9;
      const result = await macdAsync(prices, fast, slow, signal);
      return {
        id,
        preset: "macd",
        placement: "oscillator",
        data: {
          x: xArr,
          histogram: {
            y: result.histogram ?? new Float32Array(prices.length),
            positiveColor: "#26a69a",
            negativeColor: "#ef5350",
          },
          lines: [
            { id: "macd", y: result.values, color: "#42a5f5", width: 1.5 },
            { id: "signal", y: result.signal ?? result.values, color: "#ff9800", width: 1 },
          ],
          baseline: 0,
        },
      };
    }

    case "bollinger": {
      const period = options.period ?? 20;
      const stdDev = options.stdDev ?? 2;
      const result = await bollingerBandsAsync(prices, period, stdDev);
      const upper = result.upper ?? result.values;
      const lower = result.lower ?? result.values;
      return {
        id,
        preset: "bollinger",
        placement: "overlay",
        data: {
          x: xArr,
          lines: [{ id: "mid", y: result.values, color: "rgba(99, 102, 241, 0.9)", width: 1 }],
          fills: [
            {
              id: "band",
              upper,
              lower,
              color: "rgba(99, 102, 241, 0.15)",
            },
          ],
        },
      };
    }

    case "ema": {
      const period = options.period ?? 14;
      const { values } = await emaAsync(prices, period);
      return {
        id,
        preset: "ema",
        placement: "overlay",
        data: {
          x: xArr,
          lines: [{ id: "ema", y: values, color: "#ffd54f", width: 1.5 }],
        },
      };
    }

    case "sma": {
      const period = options.period ?? 14;
      const { values } = await smaAsync(prices, period);
      return {
        id,
        preset: "sma",
        placement: "overlay",
        data: {
          x: xArr,
          lines: [{ id: "sma", y: values, color: "#4fc3f7", width: 1.5 }],
        },
      };
    }

    case "stochastic": {
      if (!source) {
        throw new Error("[addIndicator] stochastic requires a candlestick source series");
      }
      const ohlc = extractOhlcSeries(source);
      const kPeriod = options.period ?? 14;
      const dPeriod = options.signalPeriod ?? 3;
      const result = stochastic(ohlc, kPeriod, dPeriod);
      return {
        id,
        preset: "stochastic",
        placement: "oscillator",
        yRange: [0, 100],
        data: {
          x: xArr,
          lines: [
            { id: "k", y: result.values, color: "#42a5f5", width: 1.5 },
            { id: "d", y: result.signal ?? result.values, color: "#ff9800", width: 1 },
          ],
          referenceLines: [
            { y: 80, color: "rgba(239, 83, 80, 0.5)", dash: [4, 4] },
            { y: 20, color: "rgba(38, 166, 154, 0.5)", dash: [4, 4] },
          ],
        },
      };
    }

    default:
      throw new Error(`[addIndicator] Unknown preset: ${preset}`);
  }
}

export function isOverlayPreset(preset: IndicatorPresetName): boolean {
  return OVERLAY_PRESETS.has(preset) || preset === "bollingerBands";
}
