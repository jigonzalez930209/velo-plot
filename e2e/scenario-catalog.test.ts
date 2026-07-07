import { describe, it, expect } from "vitest";
import { ALL_E2E_SCENARIOS } from "./scenario-ids";

describe("E2E scenario catalog", () => {
  it("harness registers every Playwright scenario id", async () => {
    const { listScenarios } = await import(
      "../docs/public/e2e/scenarios/index.mjs"
    );
    const harness = new Set(listScenarios());
    const missing = ALL_E2E_SCENARIOS.filter((id) => !harness.has(id));
    expect(missing, `harness missing: ${missing.join(", ")}`).toEqual([]);
  });

  it("Playwright list has no orphan ids absent from harness", async () => {
    const { listScenarios } = await import(
      "../docs/public/e2e/scenarios/index.mjs"
    );
    const playwright = new Set(ALL_E2E_SCENARIOS);
    const orphans = listScenarios().filter((id: string) => !playwright.has(id));
    expect(orphans, `add to scenario-ids.ts: ${orphans.join(", ")}`).toEqual([]);
  });

  it("scenario ids are unique", () => {
    const set = new Set(ALL_E2E_SCENARIOS);
    expect(set.size).toBe(ALL_E2E_SCENARIOS.length);
  });
});
