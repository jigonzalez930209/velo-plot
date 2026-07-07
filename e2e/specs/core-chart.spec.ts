import { test } from "@playwright/test";
import { scenarioTest } from "../helpers/run-scenario";
import { CORE_SCENARIOS } from "../scenario-ids";

scenarioTest(test, [...CORE_SCENARIOS]);
