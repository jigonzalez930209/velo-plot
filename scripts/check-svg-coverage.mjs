#!/usr/bin/env node
/**
 * Ensures SVG exporter modules meet the Stage 6 coverage gate (≥80% lines).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const coveragePath = resolve("coverage/svg/coverage-final.json");
const MIN = 80;

if (!existsSync(coveragePath)) {
  console.error(`Missing ${coveragePath}. Run pnpm test:svg-parity first.`);
  process.exit(1);
}

const coverage = JSON.parse(readFileSync(coveragePath, "utf8"));
const failures = [];

function pct(map, hits) {
  const keys = Object.keys(map ?? {});
  if (!keys.length) return 100;
  let covered = 0;
  for (const id of keys) {
    if ((hits?.[id] ?? 0) > 0) covered += 1;
  }
  return (covered / keys.length) * 100;
}

let checked = 0;
for (const [file, data] of Object.entries(coverage)) {
  if (!file.includes("/exporter/svg/")) continue;
  if (file.includes("__tests__")) continue;
  if (file.endsWith("/types.ts")) continue;

  checked += 1;
  const lines = pct(data.statementMap, data.s);
  if (lines < MIN) {
    const rel = file.split("velo-plot/").pop() ?? file;
    failures.push(`${rel}: lines ${lines.toFixed(1)}% < ${MIN}%`);
  }
}

if (checked === 0) {
  console.error("No exporter/svg files found in coverage report.");
  process.exit(1);
}

if (failures.length) {
  console.error(`SVG exporter coverage below ${MIN}%:\n` + failures.sort().join("\n"));
  process.exit(1);
}

console.log(`SVG exporter coverage OK (${checked} files, ≥${MIN}% lines each).`);
