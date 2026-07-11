#!/usr/bin/env npx tsx
/**
 * Regenerates the `seriesTypes` array in svg-parity.json from src/types.ts.
 * Feature statuses are preserved; only series type coverage is synced.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "svg-parity.json");
const typesSrc = readFileSync(resolve(root, "src/types.ts"), "utf8");

const seriesMatch = typesSrc.match(/export type SeriesType =\s*([\s\S]*?);/);
if (!seriesMatch) {
  console.error("Could not parse SeriesType from types.ts");
  process.exit(1);
}

const seriesTypes = [...seriesMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

manifest.generated = new Date().toISOString().slice(0, 10);
manifest.seriesTypes = seriesTypes;

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Updated svg-parity.json: ${seriesTypes.length} series types`);
