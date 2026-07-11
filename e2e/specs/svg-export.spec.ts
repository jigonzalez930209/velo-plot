import { test } from "@playwright/test";
import { scenarioTest } from "../helpers/run-scenario";
import { SVG_EXPORT_SCENARIOS } from "../scenario-ids";

scenarioTest(test, [...SVG_EXPORT_SCENARIOS.filter((id) => id !== "svg-visual-diff-line")]);
