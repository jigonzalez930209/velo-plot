import { describe, it, expect } from "vitest";
import { calculateForecast, gaussianSolve } from "./algorithms";

describe("gaussianSolve", () => {
  it("uses partial pivoting when a lower row has a larger pivot", () => {
    // Row 0 has a zero in column 0, forcing a pivot swap with row 1.
    const x = gaussianSolve(
      [
        [0, 1],
        [1, 0],
      ],
      [2, 3],
    );
    expect(x[0]).toBeCloseTo(3);
    expect(x[1]).toBeCloseTo(2);
  });

  it("returns an empty array for a singular matrix", () => {
    // Rows are linearly dependent → pivot collapses to ~0 → no solution.
    expect(gaussianSolve(
      [
        [1, 2],
        [2, 4],
      ],
      [1, 2],
    )).toEqual([]);
  });
});

const x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const y = [10, 12, 11, 13, 15, 14, 16, 18, 17, 19, 21, 20];

describe("calculateForecast", () => {
  it("throws on empty dataset", () => {
    expect(() => calculateForecast([], [], "sma", 3)).toThrow(/empty/i);
  });

  it("forecasts SMA as flat trailing average", () => {
    const result = calculateForecast(x, y, "sma", 3, { windowSize: 4 });
    expect(result.yValues).toHaveLength(3);
    expect(result.yValues.every((v) => v === result.yValues[0])).toBe(true);
    expect(result.method).toBe("sma");
  });

  it("forecasts EMA as flat at last EMA value", () => {
    const result = calculateForecast(x, y, "ema", 2, { alpha: 0.5 });
    expect(result.yValues).toHaveLength(2);
    expect(result.yValues[0]).toBe(result.yValues[1]);
  });

  it("forecasts WMA from weighted trailing window", () => {
    const result = calculateForecast(x, y, "wma", 2, { windowSize: 3 });
    expect(result.yValues).toHaveLength(2);
    expect(result.yValues[0]).toBe(result.yValues[1]);
  });

  it("forecasts linear trend with slope", () => {
    const result = calculateForecast(x, y, "linear", 3);
    expect(result.yValues).toHaveLength(3);
    expect(result.xValues[0]).toBeGreaterThan(x[x.length - 1]);
    expect(result.yValues[2]).toBeGreaterThan(result.yValues[0]);
  });

  it("forecasts simple exponential smoothing", () => {
    const result = calculateForecast(x, y, "expSmoothing", 2, { alpha: 0.4 });
    expect(result.yValues).toHaveLength(2);
    expect(result.yValues[0]).toBe(result.yValues[1]);
  });

  it("forecasts Holt double smoothing with trend", () => {
    const result = calculateForecast(x, y, "holt", 3, { alpha: 0.3, beta: 0.1 });
    expect(result.yValues).toHaveLength(3);
    expect(result.yValues.every(Number.isFinite)).toBe(true);
  });

  it("forecasts Holt-Winters with seasonality", () => {
    const seasonal = y.map((v, i) => v + Math.sin(i / 2) * 3);
    const result = calculateForecast(x, seasonal, "holtWinters", 4, {
      period: 4,
      alpha: 0.3,
      beta: 0.1,
      gamma: 0.2,
    });
    expect(result.yValues).toHaveLength(4);
    expect(result.method).toBe("holtWinters");
  });

  it("throws for unsupported forecast method", () => {
    expect(() => calculateForecast(x, y, "prophet" as any, 2)).toThrow(/not implemented/i);
  });

  it("holt on a single zero point falls back to a flat zero forecast", () => {
    // n < 2 with y[0] === 0 exercises the `y[0] || 0` fallback branch.
    const result = calculateForecast([0], [0], "holt", 3);
    expect(result.yValues).toEqual([0, 0, 0]);
  });

  it("holtWinters falls back to Holt when history is shorter than two seasons", () => {
    const shortX = [0, 1, 2, 3, 4];
    const shortY = [10, 11, 12, 13, 14];
    const result = calculateForecast(shortX, shortY, "holtWinters", 2, {
      period: 4,
      alpha: 0.3,
      beta: 0.1,
      gamma: 0.2,
    });
    expect(result.yValues).toHaveLength(2);
  });

  it("forecasts ARIMA(1,1,0) with finite values following the trend", () => {
    const result = calculateForecast(x, y, "arima", 4, { p: 1, d: 1, q: 0 });
    expect(result.yValues).toHaveLength(4);
    expect(result.yValues.every(Number.isFinite)).toBe(true);
    expect(result.method).toBe("arima");
    // Upward-drifting series should keep drifting upward.
    expect(result.yValues[3]).toBeGreaterThan(y[y.length - 1] - 5);
  });

  it("ARIMA supports a moving-average term (q>0) without throwing", () => {
    const result = calculateForecast(x, y, "arima", 3, { p: 1, d: 1, q: 1 });
    expect(result.yValues).toHaveLength(3);
    expect(result.yValues.every(Number.isFinite)).toBe(true);
  });

  it("ARIMA falls back gracefully for very short histories", () => {
    const result = calculateForecast([0, 1, 2], [1, 2, 3], "arima", 2, { p: 2, d: 1, q: 1 });
    expect(result.yValues).toHaveLength(2);
    expect(result.yValues.every(Number.isFinite)).toBe(true);
  });

  it("ARIMA falls back when the differenced series is singular", () => {
    // A perfectly linear ramp differences to a constant, so the centered
    // stationary series is all zeros → the OLS normal equations are singular
    // and produce non-finite coefficients, forcing the Holt fallback path.
    const ramp = Array.from({ length: 24 }, (_, i) => i);
    const result = calculateForecast(ramp, ramp, "arima", 4, { p: 1, d: 1, q: 1 });
    expect(result.yValues).toHaveLength(4);
    expect(result.yValues.every(Number.isFinite)).toBe(true);
  });

  it("produces confidence bands that bracket the point forecast", () => {
    const result = calculateForecast(x, y, "linear", 5, {}, 0.95);
    expect(result.lowerBound).toHaveLength(5);
    expect(result.upperBound).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      expect(result.lowerBound![i]).toBeLessThanOrEqual(result.yValues[i]);
      expect(result.upperBound![i]).toBeGreaterThanOrEqual(result.yValues[i]);
    }
    // Bands widen with the horizon for accumulating (trend) methods.
    const w0 = result.upperBound![0] - result.lowerBound![0];
    const w4 = result.upperBound![4] - result.lowerBound![4];
    expect(w4).toBeGreaterThan(w0);
    expect(result.metadata.confidence).toBe(0.95);
  });

  it("reports in-sample fit metrics", () => {
    const result = calculateForecast(x, y, "linear", 3);
    expect(result.metadata.rmse).toBeGreaterThanOrEqual(0);
    expect(result.metadata.r2).toBeLessThanOrEqual(1);
    expect(Number.isFinite(result.metadata.mae!)).toBe(true);
  });

  it("wider confidence level yields wider bands", () => {
    const narrow = calculateForecast(x, y, "holt", 3, {}, 0.8);
    const wide = calculateForecast(x, y, "holt", 3, {}, 0.99);
    const narrowW = narrow.upperBound![0] - narrow.lowerBound![0];
    const wideW = wide.upperBound![0] - wide.lowerBound![0];
    expect(wideW).toBeGreaterThan(narrowW);
  });

  it("applies default parameters for every method when params are omitted", () => {
    for (const method of ["sma", "ema", "wma", "expSmoothing", "holt", "arima"] as const) {
      const r = calculateForecast(x, y, method, 3);
      expect(r.yValues).toHaveLength(3);
      expect(r.yValues.every(Number.isFinite)).toBe(true);
    }
    // holtWinters with defaults (period 12) falls back to Holt on short history
    const hw = calculateForecast(x, y, "holtWinters", 3);
    expect(hw.yValues).toHaveLength(3);
  });

  it("holtWinters uses default coefficients when enough seasons exist", () => {
    const longX = Array.from({ length: 24 }, (_, i) => i);
    const longY = longX.map((i) => 10 + i * 0.5 + Math.sin(i) * 2);
    // period default of 12 → 24 points give exactly two seasons
    const r = calculateForecast(longX, longY, "holtWinters", 4);
    expect(r.yValues).toHaveLength(4);
    expect(r.yValues.every(Number.isFinite)).toBe(true);
  });

  it("handles a single-point history for flat and trend methods", () => {
    for (const method of ["sma", "ema", "linear", "holt"] as const) {
      const r = calculateForecast([5], [10], method, 2);
      expect(r.yValues).toHaveLength(2);
      expect(r.yValues.every(Number.isFinite)).toBe(true);
    }
  });

  it("linear trend tolerates a constant x column (zero denominator)", () => {
    const r = calculateForecast([2, 2, 2], [1, 2, 3], "linear", 2);
    expect(r.yValues).toHaveLength(2);
    expect(r.yValues.every(Number.isFinite)).toBe(true);
  });

  it("ARIMA with d=0 forecasts on the raw scale", () => {
    const r = calculateForecast(x, y, "arima", 3, { p: 1, d: 0, q: 0 });
    expect(r.yValues).toHaveLength(3);
    expect(r.yValues.every(Number.isFinite)).toBe(true);
  });

  it("reports zero R² for a perfectly flat series", () => {
    const flat = new Array(x.length).fill(5);
    const r = calculateForecast(x, flat, "sma", 2, { windowSize: 3 });
    expect(r.metadata.r2).toBe(0);
    expect(r.metadata.rmse).toBe(0);
  });
});
