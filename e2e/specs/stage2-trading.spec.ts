import { test } from "@playwright/test";
import { scenarioTest } from "../helpers/run-scenario";

const STAGE2_SCENARIOS = [
  "stage2-timescale-business-day",
  "stage2-heikin-ashi",
  "stage2-candlestick-markers",
  "stage2-price-alerts",
  "stage2-drawing-tools",
  "stage2-replay",
  "stage2-hollow-candles",
  "stage2-keyboard-plugin",
];

scenarioTest(test, STAGE2_SCENARIOS);
