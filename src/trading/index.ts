/**
 * velo-plot/trading — focused trading dashboard bundle (Stage 2).
 * Tree-shakes scientific/3D plugins; includes stacked charts, indicators, drawings, replay.
 */

// Core chart + stacked layout
export { createChart } from "../core/Chart";
export { createStackedChart } from "../core/stacked/createStackedChart";
export type { Chart, ChartOptions } from "../core/Chart";
export type {
  StackedChart,
  StackedChartOptions,
  StackedPaneConfig,
} from "../core/stacked/types";

// Time scale
export {
  mapToBusinessDayScale,
  isBusinessDay,
  businessDaySpanMs,
  type TimeScaleOptions,
  type BusinessDayMapping,
} from "../core/time/TimeScale";
export {
  isBusinessDayScaleActive,
  applyBusinessDayX,
  formatBusinessDayTick,
} from "../core/time/applyTimeScale";

// Indicators
export {
  addIndicatorToChart,
  buildIndicatorPaneFromPreset,
  computeIndicatorFromSeries,
  type AddIndicatorOptions,
  type AddIndicatorResult,
  type IndicatorPresetName,
} from "../core/indicator/addIndicator";

// Heikin-Ashi + markers + alerts
export { computeHeikinAshi } from "../core/chart/heikinAshi";
export type {
  CandlestickMarker,
  CandlestickMarkerPosition,
  CandlestickMarkerShape,
} from "../core/chart/candlestickMarkers";
export type { PriceAlertOptions } from "../core/chart/ChartAlerts";
export type { PositionLineOptions } from "../core/chart/positionLines";

// Trading plugins
export { PluginAnnotations } from "../plugins/annotations";
export type { Annotation, AnnotationType } from "../plugins/annotations";
export { PluginDrawingTools } from "../plugins/drawing-tools";
export type { DrawingMode, DrawingToolsAPI } from "../plugins/drawing-tools";
export { PluginReplay } from "../plugins/replay";
export type { ReplayAPI } from "../plugins/replay";
export { PluginKeyboard } from "../plugins/keyboard";
export { PluginStreaming } from "../plugins/streaming";

// Sync
export { ChartGroup } from "../core/sync";

// Datafeed
export {
  barsToOhlc,
  type DatafeedAdapter,
  type SymbolInfo,
  type Bar,
  type HistoryRequest,
} from "./datafeed";
export { createMockDatafeed } from "./mockDatafeed";
export {
  generateBusinessDayOhlcv,
  generateContinuousOhlcv,
  findLowestBarIndex,
  findHighestBarIndex,
  type OhlcvData,
  type OhlcvOptions,
} from "./ohlcvGenerator";

// Essential types
export type {
  SeriesOptions,
  SeriesData,
  AxisOptions,
  Bounds,
} from "../types";

// Themes
export { DARK_THEME, LIGHT_THEME, DEFAULT_THEME } from "../theme";
