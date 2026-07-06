import { test, expect } from "@playwright/test";

test.describe("Benchmark smoke", () => {
  test("stage1 benchmark page completes", async ({ page }) => {
    await page.goto("/demos/stage1-benchmark.html", { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForFunction(() => window.__STAGE1_BENCHMARK__?.done === true, null, {
      timeout: 300_000,
    });
    const report = await page.evaluate(() => window.__STAGE1_BENCHMARK__);
    expect(report?.done).toBe(true);
    expect(report?.error).toBeFalsy();
    expect((report?.scenarios?.length ?? 0) > 0).toBe(true);
  });
});

declare global {
  interface Window {
    __STAGE1_BENCHMARK__?: {
      done: boolean;
      error?: string;
      scenarios?: unknown[];
    };
  }
}
