import { test } from "@playwright/test";
import { scenarioTest } from "../helpers/run-scenario";
import { FRAMEWORK_SCENARIOS } from "../scenario-ids";

scenarioTest(test, [...FRAMEWORK_SCENARIOS]);
