/**
 * Shared types for framework bindings.
 */

import type {
  SeriesOptions,
  SeriesUpdateData,
  HeatmapData,
} from "../../types";

export type VeloPlotSeriesType = "line" | "candlestick" | "bar" | "heatmap";

export interface VeloPlotSeriesBase {
  id: string;
  type?: VeloPlotSeriesType;
  color?: string;
  width?: number;
  visible?: boolean;
  name?: string;
}

export interface VeloPlotLineSeries extends VeloPlotSeriesBase {
  type?: "line";
  x: Float32Array | Float64Array;
  y: Float32Array | Float64Array;
}

export interface VeloPlotCandlestickSeries extends VeloPlotSeriesBase {
  type: "candlestick";
  x: Float32Array | Float64Array;
  open: Float32Array | Float64Array;
  high: Float32Array | Float64Array;
  low: Float32Array | Float64Array;
  close: Float32Array | Float64Array;
}

export interface VeloPlotBarSeries extends VeloPlotSeriesBase {
  type: "bar";
  x: Float32Array | Float64Array;
  y: Float32Array | Float64Array;
}

export interface VeloPlotHeatmapSeries extends VeloPlotSeriesBase {
  type: "heatmap";
  data: HeatmapData;
}

export type VeloPlotSeries =
  | VeloPlotLineSeries
  | VeloPlotCandlestickSeries
  | VeloPlotBarSeries
  | VeloPlotHeatmapSeries;

export interface ChartSeriesActions {
  addSeries: (options: SeriesOptions) => void;
  updateSeries: (id: string, data: SeriesUpdateData) => void;
  removeSeries: (id: string) => void;
  autoScale?: () => void;
}

export interface BindingChartOptions {
  autoResize?: boolean;
  responsive?: boolean | { reducedMotion?: boolean | "auto" };
}
