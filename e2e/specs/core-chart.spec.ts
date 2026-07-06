import { test } from "@playwright/test";
import { scenarioTest } from "../helpers/run-scenario";

const CORE_SCENARIOS = [
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
];

scenarioTest(test, CORE_SCENARIOS);
