import { test } from "@playwright/test";
import { scenarioTest } from "../helpers/run-scenario";

const PLUGIN_SCENARIOS = [
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
];

scenarioTest(test, PLUGIN_SCENARIOS);
