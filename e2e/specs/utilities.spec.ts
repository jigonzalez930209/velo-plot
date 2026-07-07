import { test } from "@playwright/test";
import { scenarioTest } from "../helpers/run-scenario";
import { UTILITY_SCENARIOS } from "../scenario-ids";

scenarioTest(test, [...UTILITY_SCENARIOS]);
