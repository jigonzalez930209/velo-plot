/**
 * Snap drawing points to nearest candlestick O/H/L/C (TradingView-style magnet).
 */

export interface CandleSnapInput {
  x: number;
  y: number;
  barX: Float32Array | Float64Array;
  open: Float32Array | Float64Array;
  high: Float32Array | Float64Array;
  low: Float32Array | Float64Array;
  close: Float32Array | Float64Array;
  dataToPixelX: (x: number) => number;
  dataToPixelY: (y: number) => number;
  pixelThreshold?: number;
  enabled?: boolean;
}

export function findNearestBarIndex(
  barX: Float32Array | Float64Array,
  x: number,
): number {
  if (barX.length === 0) return -1;
  let bestIdx = 0;
  let bestDist = Math.abs(barX[0] - x);
  for (let i = 1; i < barX.length; i++) {
    const d = Math.abs(barX[i] - x);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function snapToCandle(input: CandleSnapInput): { x: number; y: number } {
  if (input.enabled === false || input.barX.length === 0) {
    return { x: input.x, y: input.y };
  }

  const idx = findNearestBarIndex(input.barX, input.x);
  if (idx < 0) return { x: input.x, y: input.y };

  const barX = input.barX[idx];
  const candidates = [
    input.open[idx],
    input.high[idx],
    input.low[idx],
    input.close[idx],
  ];

  const clickPy = input.dataToPixelY(input.y);
  const threshold = input.pixelThreshold ?? 12;
  let bestY = input.y;
  let bestPyDist = Infinity;

  for (const cy of candidates) {
    const py = input.dataToPixelY(cy);
    const dist = Math.abs(py - clickPy);
    if (dist < bestPyDist && dist <= threshold) {
      bestPyDist = dist;
      bestY = cy;
    }
  }

  return { x: barX, y: bestY };
}
