/**
 * Heikin-Ashi OHLC transform (Stage 2.20).
 */

export interface OhlcArrays {
  open: Float32Array | Float64Array;
  high: Float32Array | Float64Array;
  low: Float32Array | Float64Array;
  close: Float32Array | Float64Array;
}

export function computeHeikinAshi(ohlc: OhlcArrays): OhlcArrays {
  const n = ohlc.close.length;
  const haOpen = new Float32Array(n);
  const haHigh = new Float32Array(n);
  const haLow = new Float32Array(n);
  const haClose = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const o = ohlc.open[i];
    const h = ohlc.high[i];
    const l = ohlc.low[i];
    const c = ohlc.close[i];

    haClose[i] = (o + h + l + c) / 4;
    haOpen[i] = i === 0 ? (o + c) / 2 : (haOpen[i - 1] + haClose[i - 1]) / 2;
    haHigh[i] = Math.max(h, haOpen[i], haClose[i]);
    haLow[i] = Math.min(l, haOpen[i], haClose[i]);
  }

  return { open: haOpen, high: haHigh, low: haLow, close: haClose };
}
