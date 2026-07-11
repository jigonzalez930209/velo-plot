#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const coveragePath = resolve("coverage/core/coverage-final.json");
const MIN = 98;

if (!existsSync(coveragePath)) {
  console.error(`Missing ${coveragePath}. Run pnpm test:coverage:core first.`);
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

for (const [file, data] of Object.entries(coverage)) {
  if (/\.test\.(ts|tsx)$/.test(file)) continue;
  if (file.includes("/exporter/svg/")) continue;

  const metrics = {
    lines: pct(data.statementMap, data.s),
    statements: pct(data.statementMap, data.s),
    functions: pct(data.fnMap, data.f),
    branches: pct(data.branchMap, data.b),
  };

  for (const [key, value] of Object.entries(metrics)) {
    if (value < MIN) {
      const rel = file.split("velo-plot/").pop() ?? file;
      failures.push(`${rel}: ${key} ${value.toFixed(1)}% < ${MIN}%`);
    }
  }
}

if (failures.length) {
  console.error("Core coverage below 98%:\n" + failures.sort().join("\n"));
  process.exit(1);
}

console.log("Core coverage meets 98% on all included files.");
