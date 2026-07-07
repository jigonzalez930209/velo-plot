import { test } from "@playwright/test";
import { scenarioTest } from "../helpers/run-scenario";
import { STACKED_SCENARIOS } from "../scenario-ids";

scenarioTest(test, [...STACKED_SCENARIOS]);
