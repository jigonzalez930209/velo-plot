/**
 * UDF-inspired datafeed contract for trading charts (Stage 2.24).
 */

export interface SymbolInfo {
  symbol: string;
  name: string;
  description?: string;
  timezone?: string;
  session?: string;
  pricescale?: number;
  minmov?: number;
}

export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface HistoryRequest {
  symbol: string;
  resolution: string;
  from: number;
  to: number;
}

export interface SubscribeBarsRequest {
  symbol: string;
  resolution: string;
  onBar: (bar: Bar) => void;
}

/**
 * TradingView UDF-style adapter surface.
 */
export interface DatafeedAdapter {
  resolveSymbol(symbol: string): Promise<SymbolInfo>;
  getBars(request: HistoryRequest): Promise<Bar[]>;
  subscribeBars(request: SubscribeBarsRequest): () => void;
}

/** Convert bars to typed OHLC arrays for velo-plot series. */
export function barsToOhlc(bars: Bar[]): {
  x: Float64Array;
  open: Float32Array;
  high: Float32Array;
  low: Float32Array;
  close: Float32Array;
  volume: Float32Array;
} {
  const n = bars.length;
  const x = new Float64Array(n);
  const open = new Float32Array(n);
  const high = new Float32Array(n);
  const low = new Float32Array(n);
  const close = new Float32Array(n);
  const volume = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const b = bars[i];
    x[i] = b.time;
    open[i] = b.open;
    high[i] = b.high;
    low[i] = b.low;
    close[i] = b.close;
    volume[i] = b.volume ?? 0;
  }
  return { x, open, high, low, close, volume };
}
