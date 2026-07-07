/**
 * Measurement helper for the price-range / measure tool (TradingView-style).
 */

export interface MeasurePoint {
  x: number;
  y: number;
}

export interface Measurement {
  /** Absolute price change (end - start) */
  change: number;
  /** Percentage change relative to the start price */
  percent: number;
  /** Number of bars spanned (rounded X distance) */
  bars: number;
  /** True when the range moves up (change >= 0) */
  up: boolean;
}

export function computeMeasurement(a: MeasurePoint, b: MeasurePoint): Measurement {
  const change = b.y - a.y;
  const denom = Math.abs(a.y);
  const percent = denom > 0 ? (change / denom) * 100 : 0;
  const bars = Math.round(Math.abs(b.x - a.x));
  return { change, percent, bars, up: change >= 0 };
}

export function formatMeasurement(m: Measurement): string {
  const sign = m.change >= 0 ? "+" : "";
  return `${sign}${m.change.toFixed(2)} (${sign}${m.percent.toFixed(2)}%) · ${m.bars} bars`;
}

/** Compact price formatting used for level labels. */
export function formatPrice(value: number): string {
  const abs = Math.abs(value);
  const decimals = abs >= 1000 ? 0 : abs >= 1 ? 2 : 4;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
