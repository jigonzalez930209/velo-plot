#!/usr/bin/env node
/**
 * Validates svg-parity.json covers all SeriesType values in types.ts.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(root, "svg-parity.json"), "utf8"));
const typesSrc = readFileSync(resolve(root, "src/types.ts"), "utf8");

const seriesMatch = typesSrc.match(/export type SeriesType =\s*([\s\S]*?);/);
if (!seriesMatch) {
  console.error("Could not parse SeriesType from types.ts");
  process.exit(1);
}

const declared = [...seriesMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const manifestTypes = manifest.seriesTypes ?? [];
const missing = declared.filter((t) => !manifestTypes.includes(t));

if (missing.length > 0) {
  console.error(`svg-parity.json missing SeriesType entries: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`svg-parity OK: ${manifestTypes.length} series types, ${Object.keys(manifest.features).length} features`);
