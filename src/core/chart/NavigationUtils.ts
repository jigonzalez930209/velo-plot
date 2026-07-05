/**
 * Shared navigation helpers for zoom/pan behavior.
 */

const FREE_Y_NAV_SERIES_TYPES = new Set([
  "line",
  "band",
  "scatter",
  "area",
  "step",
  "candlestick",
  "ohlc",
]);

export interface NavSeriesLike {
  isVisible(): boolean;
  getType(): string;
}

/**
 * Pin Y minimum to 0 only for pure volume-style bar charts (bars only, no overlays).
 * Mixed indicator panes (histogram + lines) get full Y pan/zoom freedom.
 */
export function usesVolumeBarPinning(series: Iterable<NavSeriesLike>): boolean {
  const visible = Array.from(series).filter((s) => s.isVisible());
  const hasBars = visible.some((s) => s.getType() === "bar");
  if (!hasBars) return false;
  return !visible.some((s) => FREE_Y_NAV_SERIES_TYPES.has(s.getType()));
}
