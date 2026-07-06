import { coreChartScenarios } from "./core-chart.mjs";
import { stackedScenarios } from "./stacked.mjs";
import { stage2Scenarios } from "./stage2.mjs";
import { pluginScenarios, utilityScenarios } from "./plugins.mjs";

/** All E2E scenario runners keyed by id */
export const SCENARIOS = {
  ...coreChartScenarios,
  ...stackedScenarios,
  ...stage2Scenarios,
  ...pluginScenarios,
  ...utilityScenarios,
};

export function listScenarios() {
  return Object.keys(SCENARIOS).sort();
}

export async function runScenario(name, lib) {
  const fn = SCENARIOS[name];
  if (!fn) {
    throw new Error(`Unknown E2E scenario: ${name}. Available: ${listScenarios().join(", ")}`);
  }
  const data = await fn(lib);
  return { scenario: name, status: "pass", done: true, data: data ?? null };
}
