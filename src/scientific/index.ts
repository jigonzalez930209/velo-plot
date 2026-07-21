/**
 * velo-plot/scientific — focused scientific visualization bundle (Stage 5).
 * Tree-shakes trading-only plugins; includes analysis, FFT, regression,
 * forecasting, LaTeX, 3D, and related scientific tooling.
 */
import { createChart as createChartCore } from "../core/Chart";
import { createStackedChart as createStackedChartCore } from "../core/stacked/createStackedChart";
import { registerScientificBundle } from "./registerScientific";

// Core chart. Wrappers register extended series + SVG export on the used code
// path so downstream tree-shaking can never drop the registration side effect.

/** Create a chart with the scientific bundle registered. */
export function createChart(
  options: import("../core/Chart").ChartOptions,
): import("../core/Chart").Chart {
  registerScientificBundle();
  return createChartCore(options);
}
export type { Chart, ChartOptions, ExportOptions } from "../core/Chart";
export { Series } from "../core/Series";
export { EventEmitter } from "../core/EventEmitter";

// Stacked layouts (multi-pane scientific dashboards)
/** Create a stacked chart with the scientific bundle registered. */
export function createStackedChart(
  options: import("../core/stacked/types").StackedChartOptions,
): import("../core/stacked/types").StackedChart {
  registerScientificBundle();
  return createStackedChartCore(options);
}
export type {
  StackedChart,
  StackedChartOptions,
  StackedPaneConfig,
} from "../core/stacked/types";

// Scales & themes
export { LinearScale, LogScale, createScale, type Scale } from "../scales";
export {
  DARK_THEME,
  LIGHT_THEME,
  MIDNIGHT_THEME,
  ELECTROCHEM_THEME,
  DEFAULT_THEME,
  createTheme,
  getThemeByName,
  type ChartTheme,
} from "../theme";

// Analysis / FFT / math utilities (also available via PluginAnalysis)
export {
  formatWithPrefix,
  formatValue,
  formatScientific,
  getBestPrefix,
  detectCycles,
  generateCycleColors,
  detectPeaks,
  validateData,
  calculateStats,
  movingAverage,
  downsampleLTTB,
  subtractBaseline,
  integrate,
  derivative,
  cumulativeIntegral,
  calculateR2,
  solveLinearSystem,
  fft,
  ifft,
  analyzeSpectrum,
  powerSpectrum,
  dominantFrequency,
  analyzeComplexSpectrum,
  fftFromComplexInput,
  hanningWindow,
  hammingWindow,
  blackmanWindow,
} from "../plugins/analysis";

// Async workers (large scientific series)
export {
  downsampleAsync,
  ohlcDownsampleAsync,
  destroyDownsamplePool,
} from "../workers/downsampleAsync";
export {
  rsiAsync,
  smaAsync,
  emaAsync,
  macdAsync,
  bollingerBandsAsync,
  destroyIndicatorPool,
} from "../workers/indicatorsAsync";

// Scientific plugins
export { PluginAnalysis } from "../plugins/analysis";
export type { PluginAnalysisConfig } from "../plugins/analysis";
export { PluginRegression } from "../plugins/regression";
export type { PluginRegressionConfig, RegressionAPI, RegressionResult } from "../plugins/regression";
export { PluginForecasting } from "../plugins/forecasting";
export type { PluginForecastingConfig } from "../plugins/forecasting";
export { PluginLaTeX } from "../plugins/latex";
export type { PluginLaTeXConfig } from "../plugins/latex";
export { Plugin3D } from "../plugins/3d";
export type { Plugin3DConfig } from "../plugins/3d";
export { PluginAnomalyDetection } from "../plugins/anomaly-detection";
export type { PluginAnomalyDetectionConfig } from "../plugins/anomaly-detection";
export { PluginPatternRecognition } from "../plugins/pattern-recognition";
export type { PluginPatternRecognitionConfig } from "../plugins/pattern-recognition";
export { PluginMLIntegration } from "../plugins/ml-integration";
export type { PluginMLIntegrationConfig } from "../plugins/ml-integration";
export { PluginBrokenAxis } from "../plugins/broken-axis";
export type { PluginBrokenAxisConfig } from "../plugins/broken-axis";
export { PluginRadar } from "../plugins/radar";
export type { PluginRadarConfig } from "../plugins/radar";
export { PluginDataTransform } from "../plugins/data-transform";
export type { PluginDataTransformConfig } from "../plugins/data-transform";
export { PluginVirtualization } from "../plugins/virtualization";
export type { PluginVirtualizationConfig } from "../plugins/virtualization";
export { PluginSnapshot } from "../plugins/snapshot";
export type { PluginSnapshotConfig } from "../plugins/snapshot";
export { PluginAnnotations } from "../plugins/annotations";
export type { Annotation, AnnotationType } from "../plugins/annotations";
export { PluginTools } from "../plugins/tools";
export type { PluginToolsConfig } from "../plugins/tools";

// Sync (prefer ChartGroup over deprecated PluginSync)
export { ChartGroup, createChartGroup } from "../core/sync";

// Essential types
export type {
  SeriesOptions,
  SeriesData,
  AxisOptions,
  Bounds,
  SeriesType,
} from "../types";
