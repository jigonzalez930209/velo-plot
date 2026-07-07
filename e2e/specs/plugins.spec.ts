import { test } from "@playwright/test";
import { scenarioTest } from "../helpers/run-scenario";
import { PLUGIN_SCENARIOS } from "../scenario-ids";

scenarioTest(test, [...PLUGIN_SCENARIOS]);
