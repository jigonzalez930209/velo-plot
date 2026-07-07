#!/usr/bin/env node
/**
 * Install Playwright browsers used by e2e (chromium, firefox, webkit).
 *
 * Browser binaries only (no sudo):
 *   pnpm test:e2e:install
 *
 * Linux system libraries (CI / fresh machines, needs sudo on local Linux):
 *   pnpm test:e2e:install:deps
 *   # or: PLAYWRIGHT_INSTALL_DEPS=1 pnpm test:e2e:install
 */
import { spawnSync } from "node:child_process";

const BROWSERS = ["chromium", "firefox", "webkit"];

function shouldInstallDeps() {
  if (process.env.PLAYWRIGHT_INSTALL_DEPS === "0") return false;
  if (process.env.PLAYWRIGHT_INSTALL_DEPS === "1") return true;
  // CI runners have passwordless sudo for apt packages
  return process.env.CI === "true";
}

const args = ["exec", "playwright", "install", ...BROWSERS];
if (shouldInstallDeps()) {
  args.push("--with-deps");
}

console.log(`[playwright-install] pnpm ${args.join(" ")}`);
const result = spawnSync("pnpm", args, { stdio: "inherit" });

if (result.error) {
  console.error("[playwright-install] failed:", result.error.message);
  process.exit(1);
}

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

console.log(
  `[playwright-install] Done — ${BROWSERS.join(", ")} ready. Run: pnpm test:e2e:setup (first time) or pnpm test:e2e`,
);
