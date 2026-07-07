import { test } from "@playwright/test";
import { scenarioTest } from "../helpers/run-scenario";
import { STAGE2_SCENARIOS } from "../scenario-ids";

scenarioTest(test, [...STAGE2_SCENARIOS]);
