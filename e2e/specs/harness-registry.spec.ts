import { test, expect } from "@playwright/test";

/** Guard: harness registers the full scenario catalog in the browser. */
test("harness exposes scenario catalog", async ({ page }) => {
  await page.goto("/e2e/harness.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__VELO_E2E__?.done === true);
  const browserList = await page.evaluate(() => window.__VELO_E2E__?.scenarios ?? []);
  expect(browserList.length).toBeGreaterThanOrEqual(40);
  expect(browserList).toContain("chart-creates-and-renders");
  expect(browserList).toContain("stacked-addIndicator-rsi");
  expect(browserList).toContain("stage2-price-alerts");
  expect(browserList).toContain("plugin-virtualization");
});
