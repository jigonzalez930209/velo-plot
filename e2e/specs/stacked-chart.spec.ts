import { test } from "@playwright/test";
import { scenarioTest } from "../helpers/run-scenario";

const STACKED_SCENARIOS = [
  "stacked-two-panes-sync",
  "stacked-add-pane",
  "stacked-addIndicator-rsi",
  "stacked-addIndicator-macd",
  "stacked-addIndicator-bollinger",
  "stacked-addIndicator-ema",
  "stacked-addIndicator-sma",
  "stacked-export-image",
];

scenarioTest(test, STACKED_SCENARIOS);
