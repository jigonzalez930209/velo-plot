import { defineConfig, devices } from "@playwright/test";

const PORT = 9876;

/** All Playwright outputs live here for local review (gitignored). */
export const E2E_ARTIFACT_DIR = "test-results/e2e";

const saveFullArtifacts = process.env.E2E_FULL_ARTIFACTS === "1";

export default defineConfig({
  testDir: "./e2e/specs",
  outputDir: `${E2E_ARTIFACT_DIR}/artifacts`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: `${E2E_ARTIFACT_DIR}/report` }],
    ["json", { outputFile: `${E2E_ARTIFACT_DIR}/results.json` }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: saveFullArtifacts ? "on" : process.env.CI ? "on-first-retry" : "retain-on-failure",
    screenshot: saveFullArtifacts ? "on" : "only-on-failure",
    video: saveFullArtifacts ? "on" : "retain-on-failure",
  },
  webServer: {
    command: `node e2e/helpers/static-server.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/e2e/harness.html?scenario=chart-creates-and-renders`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
