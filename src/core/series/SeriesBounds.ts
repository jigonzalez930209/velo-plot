/**
 * Series Bounds Calculation Logic
 */
import type { SeriesData, Bounds, SeriesType, HeatmapData, PolarData } from "../../types";
import { calculatePolarBounds } from "../../renderer/PolarRenderer";

export function calculateSeriesBounds(
  type: SeriesType,
  data: SeriesData,
  heatmapData?: HeatmapData,
  polarData?: PolarData
): Bounds | null {
  if (type === "heatmap" && heatmapData) {
    const { xValues, yValues } = heatmapData;
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i < xValues.length; i++) {
      const v = xValues[i];
      if (v < xMin) xMin = v;
      if (v > xMax) xMax = v;
    }
    for (let i = 0; i < yValues.length; i++) {
      const v = yValues[i];
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
    }
    if (xMin === Infinity || yMin === Infinity) return null;
    return { xMin, xMax, yMin, yMax };
  }

  if (type === "polar" && polarData) {
    return calculatePolarBounds(polarData);
  }

  const { x, y, y2, open, high, low, close } = data;
  if (x.length === 0) return null;

  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;

  for (let i = 0; i < x.length; i++) {
    const xVal = x[i];
    if (!isFinite(xVal)) continue;

    if (xVal < xMin) xMin = xVal;
    if (xVal > xMax) xMax = xVal;

    const yValues: number[] = [];
    if (y.length > i && isFinite(y[i])) yValues.push(y[i]);
    if (y2 && isFinite(y2[i])) yValues.push(y2[i]);
    if (open && isFinite(open[i])) yValues.push(open[i]);
    if (high && isFinite(high[i])) yValues.push(high[i]);
    if (low && isFinite(low[i])) yValues.push(low[i]);
    if (close && isFinite(close[i])) yValues.push(close[i]);

    for (const v of yValues) {
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
    }
  }

  if (xMin === Infinity || yMin === Infinity) return null;
  return { xMin, xMax, yMin, yMax };
}
