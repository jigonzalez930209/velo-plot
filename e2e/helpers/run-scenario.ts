import { expect, type Page } from "@playwright/test";

export interface VeloE2EResult {
  scenario: string;
  status: "running" | "pass" | "fail";
  done: boolean;
  error?: string;
  data?: Record<string, unknown> | null;
  scenarios?: string[];
}

declare global {
  interface Window {
    __VELO_E2E__?: VeloE2EResult;
  }
}

/** Run a harness scenario and assert it passed. */
export async function runE2EScenario(page: Page, scenario: string): Promise<VeloE2EResult> {
  await page.goto(`/e2e/harness.html?scenario=${encodeURIComponent(scenario)}`, {
    waitUntil: "networkidle",
    timeout: 45_000,
  });

  await page.waitForFunction(() => window.__VELO_E2E__?.done === true, null, {
    timeout: 45_000,
  });

  const result = await page.evaluate(() => window.__VELO_E2E__);
  expect(result, result?.error ?? "missing E2E result").toBeTruthy();
  expect(result!.status, result!.error ?? `scenario ${scenario} failed`).toBe("pass");
  return result!;
}

/** Parameterized test helper — one Playwright test per scenario id. */
export function scenarioTest(
  register: (title: string, fn: (args: { page: Page }) => Promise<void>) => void,
  scenarios: string[],
) {
  for (const scenario of scenarios) {
    register(scenario, async ({ page }) => {
      await runE2EScenario(page, scenario);
    });
  }
}
