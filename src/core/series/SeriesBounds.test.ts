import { describe, it, expect } from "vitest";
import { calculateSeriesBounds } from "./SeriesBounds";

describe("calculateSeriesBounds", () => {
  it("returns null for empty x array", () => {
    const result = calculateSeriesBounds("line", {
      x: new Float32Array(0),
      y: new Float32Array(0),
    });
    expect(result).toBeNull();
  });

  it("returns null when all x values are NaN", () => {
    const result = calculateSeriesBounds("line", {
      x: new Float32Array([NaN, NaN]),
      y: new Float32Array([1, 2]),
    });
    expect(result).toBeNull();
  });

  it("returns valid bounds for normal data", () => {
    const result = calculateSeriesBounds("line", {
      x: new Float32Array([1, 2, 3]),
      y: new Float32Array([10, 20, 5]),
    });
    expect(result).toEqual({
      xMin: 1,
      xMax: 3,
      yMin: 5,
      yMax: 20,
    });
  });

  it("includes high/low for candlestick bounds", () => {
    const result = calculateSeriesBounds("candlestick", {
      x: new Float32Array([100]),
      y: new Float32Array([50]),
      high: new Float32Array([60]),
      low: new Float32Array([40]),
    });
    expect(result).toEqual({
      xMin: 100,
      xMax: 100,
      yMin: 40,
      yMax: 60,
    });
  });

  it("uses OHLC fields when y array is empty", () => {
    const result = calculateSeriesBounds("candlestick", {
      x: new Float32Array([1, 2]),
      y: new Float32Array(0),
      open: new Float32Array([10, 20]),
      high: new Float32Array([12, 25]),
      low: new Float32Array([8, 18]),
      close: new Float32Array([11, 22]),
    });
    expect(result).toEqual({
      xMin: 1,
      xMax: 2,
      yMin: 8,
      yMax: 25,
    });
  });

  it("does not return degenerate 0-1 placeholder for empty data", () => {
    const result = calculateSeriesBounds("line", {
      x: new Float32Array(0),
      y: new Float32Array(0),
    });
    expect(result).not.toEqual({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
  });

  it("includes y2 for band series bounds", () => {
    const result = calculateSeriesBounds("band", {
      x: new Float32Array([1, 2]),
      y: new Float32Array([10, 20]),
      y2: new Float32Array([5, 8]),
    });
    expect(result).toEqual({ xMin: 1, xMax: 2, yMin: 5, yMax: 20 });
  });

  it("returns heatmap bounds from coordinate arrays", () => {
    const result = calculateSeriesBounds(
      "heatmap",
      { x: new Float32Array(0), y: new Float32Array(0) },
      {
        xValues: new Float32Array([0, 1, 2]),
        yValues: new Float32Array([10, 20]),
        zValues: new Float32Array(6),
      },
    );
    expect(result).toEqual({ xMin: 0, xMax: 2, yMin: 10, yMax: 20 });
  });

  it("returns null for empty heatmap", () => {
    const result = calculateSeriesBounds(
      "heatmap",
      { x: new Float32Array(0), y: new Float32Array(0) },
      { xValues: new Float32Array(0), yValues: new Float32Array(0), zValues: new Float32Array(0) },
    );
    expect(result).toBeNull();
  });
});
