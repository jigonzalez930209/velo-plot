import { test, expect } from "@playwright/test";
import { ALL_E2E_SCENARIOS, STAGE2_SCENARIOS } from "../scenario-ids";

/** Guard: harness registers the full scenario catalog in the browser. */
test("harness exposes scenario catalog", async ({ page }) => {
  await page.goto("/e2e/harness.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__VELO_E2E__?.done === true);
  const browserList = await page.evaluate(() => window.__VELO_E2E__?.scenarios ?? []);
  expect(browserList.length).toBe(ALL_E2E_SCENARIOS.length);
  for (const id of ALL_E2E_SCENARIOS) {
    expect(browserList, `harness missing ${id}`).toContain(id);
  }
  for (const id of STAGE2_SCENARIOS) {
    expect(browserList).toContain(id);
  }
});
