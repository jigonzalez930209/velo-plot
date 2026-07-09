/**
 * Canonical E2E scenario IDs — must match docs/public/e2e/scenarios/*.mjs
 * and be executed by Playwright spec files.
 */
export const CORE_SCENARIOS = [
  "chart-creates-and-renders",
  "chart-line-series",
  "chart-scatter-series",
  "chart-bar-series",
  "chart-area-series",
  "chart-step-series",
  "chart-band-series",
  "chart-candlestick-series",
  "chart-boxplot-series",
  "chart-waterfall-series",
  "chart-heatmap-series",
  "chart-zoom-fit-export",
  "chart-annotations",
  "chart-cursor-crosshair",
  "chart-theme-responsive",
] as const;

export const STACKED_SCENARIOS = [
  "stacked-two-panes-sync",
  "stacked-add-pane",
  "stacked-addIndicator-rsi",
  "stacked-addIndicator-macd",
  "stacked-addIndicator-bollinger",
  "stacked-addIndicator-ema",
  "stacked-addIndicator-sma",
  "stacked-addIndicator-stochastic",
  "stacked-export-image",
] as const;

export const STAGE2_SCENARIOS = [
  "stage2-timescale-business-day",
  "stage2-business-day-chart",
  "stage2-heikin-ashi",
  "stage2-heikin-ashi-series",
  "stage2-candlestick-markers",
  "stage2-price-alerts",
  "stage2-get-alerts",
  "stage2-position-lines",
  "stage2-drawing-tools",
  "stage2-drawing-fibonacci",
  "stage2-replay",
  "stage2-hollow-candles",
  "stage2-keyboard-plugin",
  "stage2-stochastic-indicator",
  "stage2-mock-datafeed",
] as const;

export const PLUGIN_SCENARIOS = [
  "plugin-virtualization",
  "plugin-virtualization-candlestick",
  "plugin-caching",
  "plugin-lazy-load",
  "plugin-analysis-indicators",
  "plugin-snapshot-export",
  "plugin-streaming-smoke",
  "plugin-tools-delta-peak",
  "plugin-regression-smoke",
  "plugin-forecasting-smoke",
  "plugin-data-export",
  "plugin-i18n-smoke",
] as const;

export const UTILITY_SCENARIOS = [
  "util-scales-linear-log",
  "util-chart-group-sync",
  "util-indicator-build-pane",
] as const;

export const FRAMEWORK_SCENARIOS = [
  "framework-react-veloplot",
  "framework-react-stackedplot",
  "framework-vue-veloplot",
  "framework-svelte-create-veloplot",
  "framework-solid-veloplot",
  "framework-angular-hooks",
  "framework-astro-wrapper",
] as const;

export const ALL_E2E_SCENARIOS = [
  ...CORE_SCENARIOS,
  ...STACKED_SCENARIOS,
  ...STAGE2_SCENARIOS,
  ...PLUGIN_SCENARIOS,
  ...UTILITY_SCENARIOS,
  ...FRAMEWORK_SCENARIOS,
] as const;

export type E2EScenarioId = (typeof ALL_E2E_SCENARIOS)[number];
