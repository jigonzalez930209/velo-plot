/**
 * Trade markers on candlestick series (Stage 2.14).
 */

export type CandlestickMarkerPosition = "aboveBar" | "belowBar" | "inBar";
export type CandlestickMarkerShape = "arrowUp" | "arrowDown" | "circle";

export interface CandlestickMarker {
  /** X value (epoch ms or data X) */
  time: number;
  position?: CandlestickMarkerPosition;
  shape?: CandlestickMarkerShape;
  text?: string;
  color?: string;
}

export interface CandlestickMarkerDrawItem {
  px: number;
  py: number;
  shape: CandlestickMarkerShape;
  color: string;
  text?: string;
}

/** Find nearest bar index for marker time. */
export function findBarIndex(x: Float32Array | Float64Array, time: number): number {
  if (x.length === 0) return -1;
  let best = 0;
  let bestDist = Math.abs(x[0] - time);
  for (let i = 1; i < x.length; i++) {
    const d = Math.abs(x[i] - time);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export function resolveMarkerY(
  position: CandlestickMarkerPosition,
  high: number,
  low: number,
  close: number,
): number {
  switch (position) {
    case "belowBar":
      return low;
    case "inBar":
      return close;
    case "aboveBar":
    default:
      return high;
  }
}
