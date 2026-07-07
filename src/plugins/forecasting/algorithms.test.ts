import { describe, it, expect } from "vitest";
import { calculateForecast } from "./algorithms";

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
    expect(() => calculateForecast(x, y, "arima" as any, 2)).toThrow(/not implemented/i);
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
});
