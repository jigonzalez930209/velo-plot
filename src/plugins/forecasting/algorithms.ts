/**
 * Forecasting Algorithms
 *
 * Native implementations of time series forecasting methods.
 *
 * ---------------------------------------------------------------------------
 * Method status audit (task 3.1)
 * ---------------------------------------------------------------------------
 * | Method        | Status       | Notes                                     |
 * |---------------|--------------|-------------------------------------------|
 * | sma           | implemented  | Flat projection at trailing average       |
 * | wma           | implemented  | Flat projection at weighted trailing avg  |
 * | ema           | implemented  | Flat projection at last EMA value         |
 * | expSmoothing  | implemented  | Simple exponential smoothing (SES)        |
 * | holt          | implemented  | Double exponential smoothing (trend)      |
 * | holtWinters   | implemented  | Triple exponential smoothing (seasonal)   |
 * | linear        | implemented  | OLS linear trend projection               |
 * | arima         | implemented  | ARIMA(p,d,q) via Hannan-Rissanen (simple) |
 *
 * Every public method returns a finite forecast plus 95% (configurable)
 * confidence bands derived from in-sample one-step residuals. No public
 * method throws for a supported `ForecastingMethod`.
 */

import type { ForecastingMethod, ForecastingParams, ForecastingResult } from './types';

/** Internal result of a single method: forecast plus in-sample fitted values. */
interface MethodResult {
  /** Point forecast for the requested horizon. */
  yValues: number[];
  /**
   * In-sample one-step-ahead fitted values aligned with the history `y`.
   * `fitted[i]` is the prediction of `y[i]` using only `y[0..i-1]`.
   * `null` entries are ignored when computing residuals.
   */
  fitted?: (number | null)[];
  /** Whether forecast uncertainty accumulates with the horizon (sqrt growth). */
  accumulates: boolean;
}

function toArray(a: number[] | Float64Array | Float32Array): number[] {
  return Array.from(a);
}

/**
 * Map a confidence level (e.g. 0.95) to a normal-distribution z multiplier.
 */
function zForConfidence(confidence: number): number {
  const table: Array<[number, number]> = [
    [0.5, 0.674],
    [0.68, 0.994],
    [0.8, 1.282],
    [0.9, 1.645],
    [0.95, 1.96],
    [0.975, 2.241],
    [0.99, 2.576],
    [0.995, 2.807],
  ];
  let best = table[0];
  let bestDiff = Infinity;
  for (const entry of table) {
    const diff = Math.abs(entry[0] - confidence);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = entry;
    }
  }
  return best[1];
}

/**
 * Main dispatcher for forecasting algorithms.
 */
export function calculateForecast(
  x: number[] | Float64Array | Float32Array,
  y: number[] | Float64Array | Float32Array,
  method: ForecastingMethod,
  horizon: number,
  params: ForecastingParams = {},
  confidence = 0.95
): ForecastingResult {
  const n = x.length;
  if (n === 0) throw new Error('Dataset is empty');

  const ya = toArray(y);
  const xa = toArray(x);

  // Determine time step (assuming regular intervals)
  const dt = n > 1 ? (xa[n - 1] - xa[0]) / (n - 1) : 1;
  const lastX = xa[n - 1];

  let result: MethodResult;

  switch (method) {
    case 'sma':
      result = forecastSMA(ya, horizon, params.windowSize || 10);
      break;
    case 'ema':
      result = forecastEMA(ya, horizon, params.alpha ?? 0.3);
      break;
    case 'linear':
      result = forecastLinear(xa, ya, horizon);
      break;
    case 'expSmoothing':
      result = forecastSimpleExpSmoothing(ya, horizon, params.alpha ?? 0.3);
      break;
    case 'holt':
      result = forecastHolt(ya, horizon, params.alpha ?? 0.3, params.beta ?? 0.1);
      break;
    case 'wma':
      result = forecastWMA(ya, horizon, params.windowSize || 10);
      break;
    case 'holtWinters':
      result = forecastHoltWinters(
        ya,
        horizon,
        params.period || 12,
        params.alpha ?? 0.3,
        params.beta ?? 0.1,
        params.gamma ?? 0.1
      );
      break;
    case 'arima':
      result = forecastARIMA(
        ya,
        horizon,
        params.p ?? 1,
        params.d ?? 1,
        params.q ?? 0
      );
      break;
    default:
      throw new Error(`Method ${method} not implemented yet`);
  }

  // Generate future X values
  const futureX = new Array(horizon);
  for (let i = 0; i < horizon; i++) {
    futureX[i] = lastX + (i + 1) * dt;
  }

  // Compute residual-based statistics and confidence bands.
  const metrics = calculateFitMetrics(ya, result.fitted);
  const z = zForConfidence(confidence);
  const sigma = metrics.rmse;
  const { lower, upper } = buildConfidenceBands(
    result.yValues,
    sigma,
    z,
    result.accumulates
  );

  return {
    xValues: futureX,
    yValues: result.yValues,
    lowerBound: lower,
    upperBound: upper,
    method,
    metadata: { ...metrics, confidence },
  };
}

/**
 * Build symmetric confidence bands around the point forecast.
 * When `accumulates` is true the uncertainty widens with sqrt(horizon step),
 * reflecting the compounding error of trend/AR models.
 */
function buildConfidenceBands(
  yValues: number[],
  sigma: number,
  z: number,
  accumulates: boolean
): { lower: number[]; upper: number[] } {
  const lower = new Array(yValues.length);
  const upper = new Array(yValues.length);
  for (let i = 0; i < yValues.length; i++) {
    const growth = accumulates ? Math.sqrt(i + 1) : 1;
    const margin = z * sigma * growth;
    lower[i] = yValues[i] - margin;
    upper[i] = yValues[i] + margin;
  }
  return { lower, upper };
}

// ===========================================================================
// Moving-average family
// ===========================================================================

/**
 * Weighted Moving Average (WMA).
 * Uses linear weights on the trailing window; projects flat at last WMA value.
 */
function forecastWMA(y: number[], horizon: number, window: number): MethodResult {
  const n = y.length;
  const effectiveWindow = Math.min(window, n);

  const wmaAt = (end: number): number => {
    // end is always >= 1 here, so the trailing window w is always >= 1.
    const w = Math.min(effectiveWindow, end);
    let weightedSum = 0;
    let weightTotal = 0;
    for (let i = 0; i < w; i++) {
      const weight = i + 1;
      weightedSum += y[end - w + i] * weight;
      weightTotal += weight;
    }
    return weightedSum / weightTotal;
  };

  const fitted: (number | null)[] = new Array(n).fill(null);
  for (let i = 1; i < n; i++) fitted[i] = wmaAt(i);

  const wma = wmaAt(n);
  return { yValues: new Array(horizon).fill(wma), fitted, accumulates: false };
}

/**
 * Simple Moving Average (SMA).
 * Historical SMA used for projection (flat line at last average).
 */
function forecastSMA(y: number[], horizon: number, window: number): MethodResult {
  const n = y.length;
  const effectiveWindow = Math.min(window, n);

  const smaAt = (end: number): number => {
    // end is always >= 1 here, so the trailing window w is always >= 1.
    const w = Math.min(effectiveWindow, end);
    let sum = 0;
    for (let i = end - w; i < end; i++) sum += y[i];
    return sum / w;
  };

  const fitted: (number | null)[] = new Array(n).fill(null);
  for (let i = 1; i < n; i++) fitted[i] = smaAt(i);

  const avg = smaAt(n);
  return { yValues: new Array(horizon).fill(avg), fitted, accumulates: false };
}

/**
 * Exponential Moving Average (EMA).
 */
function forecastEMA(y: number[], horizon: number, alpha: number): MethodResult {
  const n = y.length;
  let ema = y[0];
  const fitted: (number | null)[] = new Array(n).fill(null);

  for (let i = 1; i < n; i++) {
    fitted[i] = ema; // one-step forecast is the previous EMA
    ema = alpha * y[i] + (1 - alpha) * ema;
  }

  return { yValues: new Array(horizon).fill(ema), fitted, accumulates: false };
}

/**
 * Linear Trend Projection.
 * Fits y = mx + b to the historical data.
 */
function forecastLinear(x: number[], y: number[], horizon: number): MethodResult {
  const n = x.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
  }

  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  const fitted: (number | null)[] = new Array(n);
  for (let i = 0; i < n; i++) fitted[i] = slope * x[i] + intercept;

  const lastX = x[n - 1];
  const dt = n > 1 ? (x[n - 1] - x[0]) / (n - 1) : 1;
  const yValues = new Array(horizon);
  for (let i = 0; i < horizon; i++) {
    const nextX = lastX + (i + 1) * dt;
    yValues[i] = slope * nextX + intercept;
  }

  return { yValues, fitted, accumulates: true };
}

/**
 * Simple Exponential Smoothing (SES).
 */
function forecastSimpleExpSmoothing(y: number[], horizon: number, alpha: number): MethodResult {
  const n = y.length;
  let level = y[0];
  const fitted: (number | null)[] = new Array(n).fill(null);

  for (let i = 1; i < n; i++) {
    fitted[i] = level;
    level = alpha * y[i] + (1 - alpha) * level;
  }

  return { yValues: new Array(horizon).fill(level), fitted, accumulates: false };
}

/**
 * Holt's Linear Trend (Double Exponential Smoothing).
 */
function forecastHolt(y: number[], horizon: number, alpha: number, beta: number): MethodResult {
  const n = y.length;
  if (n < 2) {
    return { yValues: new Array(horizon).fill(y[0] || 0), fitted: [], accumulates: true };
  }

  let level = y[0];
  let trend = y[1] - y[0];
  const fitted: (number | null)[] = new Array(n).fill(null);

  for (let i = 1; i < n; i++) {
    fitted[i] = level + trend; // one-step forecast
    const lastLevel = level;
    level = alpha * y[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - lastLevel) + (1 - beta) * trend;
  }

  const yValues = new Array(horizon);
  for (let i = 0; i < horizon; i++) yValues[i] = level + (i + 1) * trend;

  return { yValues, fitted, accumulates: true };
}

/**
 * Holt-Winters (Triple Exponential Smoothing, additive seasonality).
 */
function forecastHoltWinters(
  y: number[],
  horizon: number,
  period: number,
  alpha: number,
  beta: number,
  gamma: number
): MethodResult {
  const n = y.length;
  if (n < period * 2) {
    // Fallback to Holt if not enough data for seasonality
    return forecastHolt(y, horizon, alpha, beta);
  }

  // 1. Initial Seasonality
  const seasonals = new Array(period);
  const seasonAverages = new Array(Math.floor(n / period));
  for (let i = 0; i < seasonAverages.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += y[i * period + j];
    seasonAverages[i] = sum / period;
  }

  for (let i = 0; i < period; i++) {
    let sumOverAvg = 0;
    for (let j = 0; j < seasonAverages.length; j++) {
      sumOverAvg += y[j * period + i] - seasonAverages[j];
    }
    seasonals[i] = sumOverAvg / seasonAverages.length;
  }

  // 2. Initial Level and Trend
  let level = seasonAverages[0];
  let trend =
    (seasonAverages[seasonAverages.length - 1] - seasonAverages[0]) /
    ((seasonAverages.length - 1) * period);

  const fitted: (number | null)[] = new Array(n).fill(null);

  // 3. Update coefficients
  for (let i = 0; i < n; i++) {
    const seasonal = seasonals[i % period];
    if (i > 0) fitted[i] = level + trend + seasonal;
    const lastLevel = level;
    const val = y[i];
    level = alpha * (val - seasonal) + (1 - alpha) * (level + trend);
    trend = beta * (level - lastLevel) + (1 - beta) * trend;
    seasonals[i % period] = gamma * (val - level) + (1 - gamma) * seasonal;
  }

  // 4. Forecast
  const yValues = new Array(horizon);
  for (let i = 0; i < horizon; i++) {
    const m = i + 1;
    yValues[i] = level + m * trend + seasonals[(n + i) % period];
  }

  return { yValues, fitted, accumulates: true };
}

// ===========================================================================
// ARIMA(p, d, q)
// ===========================================================================

/**
 * Simple native ARIMA implementation.
 *
 * - Differences the series `d` times to achieve (approximate) stationarity.
 * - Estimates AR(p) and MA(q) coefficients using the two-stage
 *   Hannan-Rissanen procedure (long AR to recover innovations, then OLS on
 *   lagged values and lagged innovations).
 * - Forecasts recursively on the differenced scale, then integrates back.
 *
 * Falls back to Holt's linear trend when there is not enough data to fit the
 * requested orders, so the method never throws for valid input.
 */
function forecastARIMA(
  y: number[],
  horizon: number,
  p: number,
  d: number,
  q: number
): MethodResult {
  const n = y.length;
  const order = Math.max(p, q);
  // Need enough observations to difference and fit; otherwise degrade gracefully.
  if (n < d + order + 2 || n < 4) {
    return forecastHolt(y, horizon, 0.3, 0.1);
  }

  // 1. Difference d times, keeping every intermediate level for integration.
  const diffLevels: number[][] = [y.slice()];
  for (let k = 0; k < d; k++) {
    diffLevels.push(difference(diffLevels[k]));
  }
  const w = diffLevels[d]; // fully differenced (stationary) series
  const m = w.length;

  // Center the differenced series around its mean.
  const mean = w.reduce((s, v) => s + v, 0) / m;
  const wc = w.map((v) => v - mean);

  // 2. Stage 1 - recover innovation (residual) estimates via a long AR fit.
  let innovations = new Array(m).fill(0);
  if (q > 0) {
    const arLong = Math.min(Math.max(p + q + 2, 5), Math.floor(m / 2));
    const { residuals } = fitAR(wc, arLong);
    innovations = residuals;
  }

  // 3. Stage 2 - regress w_t on its p lags and q lagged innovations.
  const start = Math.max(p, q);
  const rows: number[][] = [];
  const targets: number[] = [];
  for (let t = start; t < m; t++) {
    const row: number[] = [];
    for (let i = 1; i <= p; i++) row.push(wc[t - i]);
    for (let j = 1; j <= q; j++) row.push(innovations[t - j]);
    rows.push(row);
    targets.push(wc[t]);
  }

  let coeffs: number[] = [];
  if (rows.length > 0 && rows[0].length > 0) {
    coeffs = olsSolve(rows, targets);
  }
  if (coeffs.length !== p + q || coeffs.some((c) => !Number.isFinite(c))) {
    // Fitting failed (singular/ill-conditioned) - fall back.
    return forecastHolt(y, horizon, 0.3, 0.1);
  }
  const ar = coeffs.slice(0, p);
  const ma = coeffs.slice(p, p + q);

  // 4. In-sample one-step fitted values (on original scale) for residual sigma.
  const fitted: (number | null)[] = new Array(n).fill(null);
  const fittedResiduals = new Array(m).fill(0);
  for (let t = start; t < m; t++) {
    let pred = 0;
    for (let i = 1; i <= p; i++) pred += ar[i - 1] * wc[t - i];
    for (let j = 1; j <= q; j++) pred += ma[j - 1] * fittedResiduals[t - j];
    fittedResiduals[t] = wc[t] - pred;
    // Map differenced fitted value back to the original scale by adding the
    // previous original observation chain. For d>=1 we approximate by adding
    // the last non-differenced value; exact integration below handles forecasts.
    fitted[t + (n - m)] = integrateFittedPoint(diffLevels, d, t, pred + mean);
  }

  // 5. Recursive forecast on the differenced/centered scale.
  const wHist = wc.slice();
  const eHist = fittedResiduals.slice();
  const forecastDiff: number[] = [];
  for (let h = 0; h < horizon; h++) {
    let pred = 0;
    // wHist/eHist always have at least `order` entries here, so the lag index
    // is always in range.
    for (let i = 1; i <= p; i++) {
      pred += ar[i - 1] * wHist[wHist.length - i];
    }
    for (let j = 1; j <= q; j++) {
      pred += ma[j - 1] * eHist[eHist.length - j];
    }
    wHist.push(pred);
    eHist.push(0); // expected future innovation is zero
    forecastDiff.push(pred + mean);
  }

  // 6. Integrate the forecast back d times to the original scale.
  const yValues = integrateForecast(diffLevels, d, forecastDiff);

  return { yValues, fitted, accumulates: true };
}

/** First difference of a series. */
function difference(series: number[]): number[] {
  const out = new Array(series.length - 1);
  for (let i = 1; i < series.length; i++) out[i - 1] = series[i] - series[i - 1];
  return out;
}

/**
 * Integrate a differenced forecast back to the original scale.
 * `diffLevels[0]` is the original series, `diffLevels[d]` fully differenced.
 */
function integrateForecast(diffLevels: number[][], d: number, forecastDiff: number[]): number[] {
  let current = forecastDiff.slice();
  for (let k = d; k >= 1; k--) {
    const parent = diffLevels[k - 1];
    let last = parent[parent.length - 1];
    const integrated = new Array(current.length);
    for (let i = 0; i < current.length; i++) {
      last += current[i];
      integrated[i] = last;
    }
    current = integrated;
  }
  return current;
}

/**
 * Best-effort mapping of a single in-sample differenced prediction back to the
 * original scale (used only for residual-sigma estimation).
 */
function integrateFittedPoint(
  diffLevels: number[][],
  d: number,
  t: number,
  diffPred: number
): number {
  if (d === 0) return diffPred;
  // Add the previous observed original value chain.
  const parent = diffLevels[d - 1];
  // parent is one longer than the differenced series, so index t is in range.
  const base = parent[t];
  // For d>1 this is an approximation; sufficient for a residual scale estimate.
  return base + diffPred;
}

/**
 * Fit an AR(order) model via ordinary least squares and return coefficients
 * plus the in-sample residuals aligned to the input series (leading entries 0).
 */
function fitAR(series: number[], order: number): { coeffs: number[]; residuals: number[] } {
  const m = series.length;
  const rows: number[][] = [];
  const targets: number[] = [];
  for (let t = order; t < m; t++) {
    const row: number[] = [];
    for (let i = 1; i <= order; i++) row.push(series[t - i]);
    rows.push(row);
    targets.push(series[t]);
  }
  const coeffs = rows.length > 0 ? olsSolve(rows, targets) : new Array(order).fill(0);
  const residuals = new Array(m).fill(0);
  for (let t = order; t < m; t++) {
    let pred = 0;
    for (let i = 1; i <= order; i++) pred += (coeffs[i - 1] || 0) * series[t - i];
    residuals[t] = series[t] - pred;
  }
  return { coeffs, residuals };
}

/**
 * Solve a linear least-squares problem `X b = y` via the normal equations
 * with Gaussian elimination. Returns [] on a singular system.
 */
function olsSolve(X: number[][], y: number[]): number[] {
  const rows = X.length;
  const cols = X[0].length;

  // Normal equations: (XᵀX) b = Xᵀy
  const xtx: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0));
  const xty: number[] = new Array(cols).fill(0);

  for (let i = 0; i < rows; i++) {
    for (let a = 0; a < cols; a++) {
      xty[a] += X[i][a] * y[i];
      for (let b = 0; b < cols; b++) {
        xtx[a][b] += X[i][a] * X[i][b];
      }
    }
  }

  // Tiny ridge term to stabilise near-singular systems.
  for (let a = 0; a < cols; a++) xtx[a][a] += 1e-8;

  return gaussianSolve(xtx, xty);
}

/**
 * Solve `A x = b` for a square matrix via Gaussian elimination with partial
 * pivoting. Returns [] if the matrix is singular.
 */
export function gaussianSolve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return [];
    [M[col], M[pivot]] = [M[pivot], M[col]];

    // Eliminate
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }

  const x = new Array(n);
  for (let i = 0; i < n; i++) x[i] = M[i][n] / M[i][i];
  return x;
}

/**
 * Compute error metrics from in-sample one-step residuals.
 * `rmse` doubles as the residual sigma used to build confidence bands.
 */
function calculateFitMetrics(
  historical: number[],
  fitted?: (number | null)[]
): { mse: number; rmse: number; mae: number; r2: number } {
  if (!fitted || fitted.length === 0) {
    return { mse: 0, rmse: 0, mae: 0, r2: 0 };
  }

  let sse = 0;
  let sae = 0;
  let count = 0;
  const observed: number[] = [];

  for (let i = 0; i < fitted.length && i < historical.length; i++) {
    const f = fitted[i];
    if (f === null || f === undefined || !Number.isFinite(f)) continue;
    const err = historical[i] - f;
    sse += err * err;
    sae += Math.abs(err);
    observed.push(historical[i]);
    count++;
  }

  if (count === 0) return { mse: 0, rmse: 0, mae: 0, r2: 0 };

  const mse = sse / count;
  const rmse = Math.sqrt(mse);
  const mae = sae / count;

  const mean = observed.reduce((s, v) => s + v, 0) / observed.length;
  const sst = observed.reduce((s, v) => s + (v - mean) * (v - mean), 0);
  const r2 = sst > 0 ? 1 - sse / sst : 0;

  return {
    mse: round(mse),
    rmse: round(rmse),
    mae: round(mae),
    r2: round(r2),
  };
}

function round(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}
