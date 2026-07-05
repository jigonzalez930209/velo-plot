export type IndicatorMarkerKind = "peak" | "trough";

/** Two-tone line segments — buy/sell zones relative to a reference. */
export interface IndicatorLineColorZones {
  /** Constant Y, `'zero'`, or `id` of another line layer in the same indicator */
  ref?: number | "zero" | string;
  /** Color when line is at or above the reference */
  aboveColor: string;
  /** Color when line is below the reference */
  belowColor: string;
}

export interface IndicatorLineLayer {
  id?: string;
  y: Float32Array | Float64Array | number[];
  color?: string;
  width?: number;
  opacity?: number;
  /** Split line into colored segments (e.g. buy above signal, sell below) */
  colorZones?: IndicatorLineColorZones;
}

export interface IndicatorFillLayer {
  id?: string;
  upper: Float32Array | Float64Array | number[];
  lower: Float32Array | Float64Array | number[];
  color?: string;
  opacity?: number;
}

export interface IndicatorMarker {
  x: number;
  y: number;
  kind: IndicatorMarkerKind;
  color?: string;
  size?: number;
}

export interface IndicatorHistogramLayer {
  y: Float32Array | Float64Array | number[];
  positiveColor?: string;
  negativeColor?: string;
  opacity?: number;
  barWidth?: number;
}

export interface IndicatorReferenceLine {
  y: number;
  color?: string;
  width?: number;
  dash?: number[];
}

/** Composite trading-indicator payload (histogram, lines, fills, markers). */
export interface IndicatorData {
  x: Float32Array | Float64Array | number[];
  histogram?: IndicatorHistogramLayer;
  lines?: IndicatorLineLayer[];
  fills?: IndicatorFillLayer[];
  markers?: IndicatorMarker[];
  /** Baseline Y value (default 0) — rendered as dashed reference line */
  baseline?: number;
  referenceLines?: IndicatorReferenceLine[];
}

export interface IndicatorStyle {
  baselineColor?: string;
  baselineWidth?: number;
  baselineDash?: number[];
  peakColor?: string;
  troughColor?: string;
  peakSize?: number;
  troughSize?: number;
}

export interface IndicatorSeriesOptions {
  id: string;
  type: "indicator";
  data: IndicatorData;
  style?: IndicatorStyle;
  visible?: boolean;
  name?: string;
}
