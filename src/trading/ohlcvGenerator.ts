/**
 * Seeded OHLCV generators for trading demos and tests.
 */

export interface OhlcvData {
  x: Float64Array;
  open: Float32Array;
  high: Float32Array;
  low: Float32Array;
  close: Float32Array;
  volume: Float32Array;
}

export interface OhlcvOptions {
  startMs?: number;
  seed?: number;
}

const MS_DAY = 86_400_000;

/** Mulberry32 PRNG — deterministic when seed is provided. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resolveRand(seed?: number): () => number {
  return seed !== undefined ? mulberry32(seed) : Math.random;
}

function resolveOptions(
  startMsOrOptions: number | OhlcvOptions,
  legacySeed?: number,
  defaultStartMs = Date.UTC(2024, 0, 2),
): { startMs: number; seed?: number } {
  const opts: OhlcvOptions =
    typeof startMsOrOptions === "object"
      ? startMsOrOptions
      : { startMs: startMsOrOptions, seed: legacySeed };
  return {
    startMs: opts.startMs ?? defaultStartMs,
    seed: opts.seed,
  };
}

/** OHLCV with business-day timestamps (weekends skipped in data). */
export function generateBusinessDayOhlcv(
  n: number,
  startMsOrOptions: number | OhlcvOptions = Date.UTC(2024, 0, 2),
  legacySeed?: number,
): OhlcvData {
  const { startMs, seed } = resolveOptions(startMsOrOptions, legacySeed);
  const rand = resolveRand(seed);

  const x = new Float64Array(n);
  const open = new Float32Array(n);
  const high = new Float32Array(n);
  const low = new Float32Array(n);
  const close = new Float32Array(n);
  const volume = new Float32Array(n);

  let t = startMs;
  let price = 100;

  for (let i = 0; i < n; i++) {
    while (new Date(t).getUTCDay() === 0 || new Date(t).getUTCDay() === 6) {
      t += MS_DAY;
    }
    x[i] = t;
    open[i] = price;
    const change = (rand() - 0.48) * 3;
    close[i] = price + change;
    high[i] = Math.max(open[i], close[i]) + rand() * 1.5;
    low[i] = Math.min(open[i], close[i]) - rand() * 1.5;
    volume[i] = 500_000 + rand() * 2_000_000;
    price = close[i];
    t += MS_DAY;
  }

  return { x, open, high, low, close, volume };
}

/** OHLCV with consecutive calendar days (includes weekends). */
export function generateContinuousOhlcv(
  n: number,
  startMsOrOptions: number | OhlcvOptions = Date.UTC(2024, 0, 1),
  legacySeed?: number,
): OhlcvData {
  const { startMs, seed } = resolveOptions(
    startMsOrOptions,
    legacySeed,
    Date.UTC(2024, 0, 1),
  );
  const rand = resolveRand(seed);

  const x = new Float64Array(n);
  const open = new Float32Array(n);
  const high = new Float32Array(n);
  const low = new Float32Array(n);
  const close = new Float32Array(n);
  const volume = new Float32Array(n);

  let price = 100;
  for (let i = 0; i < n; i++) {
    x[i] = startMs + i * MS_DAY;
    open[i] = price;
    const change = (rand() - 0.48) * 3;
    close[i] = price + change;
    high[i] = Math.max(open[i], close[i]) + rand() * 1.5;
    low[i] = Math.min(open[i], close[i]) - rand() * 1.5;
    volume[i] = 500_000 + rand() * 2_000_000;
    price = close[i];
  }

  return { x, open, high, low, close, volume };
}

/** Index of the bar with the lowest low. */
export function findLowestBarIndex(low: Float32Array): number {
  let idx = 0;
  for (let i = 1; i < low.length; i++) {
    if (low[i] < low[idx]) idx = i;
  }
  return idx;
}

/** Index of the bar with the highest high. */
export function findHighestBarIndex(high: Float32Array): number {
  let idx = 0;
  for (let i = 1; i < high.length; i++) {
    if (high[i] > high[idx]) idx = i;
  }
  return idx;
}
