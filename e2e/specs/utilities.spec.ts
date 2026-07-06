import { test } from "@playwright/test";
import { scenarioTest } from "../helpers/run-scenario";

const UTILITY_SCENARIOS = [
  "util-scales-linear-log",
  "util-chart-group-sync",
  "util-indicator-build-pane",
];

scenarioTest(test, UTILITY_SCENARIOS);
