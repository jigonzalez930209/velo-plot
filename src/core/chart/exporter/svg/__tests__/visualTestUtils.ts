import { expect } from "vitest";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), "__fixtures__");

export function fixturesPath(name: string): string {
  return resolve(fixturesDir, name);
}

/** Normalize volatile SVG ids for golden string comparison. */
export function normalizeSvg(svg: string): string {
  return svg
    .replace(/vp-(grad|def|clip)-[a-zA-Z0-9-]+/g, "vp-NORM")
    .replace(/id="vp-clip-[^"]+"/g, 'id="vp-clip-NORM"')
    .replace(/\s+/g, " ")
    .trim();
}

export function rasterizeSvg(svg: string, width = 520): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: true },
  });
  return Buffer.from(resvg.render().asPng());
}

export function readGoldenText(name: string): string {
  return readFileSync(fixturesPath(name), "utf8");
}

export function readGoldenPng(name: string): Buffer {
  return readFileSync(fixturesPath(name));
}

export function writeGolden(name: string, data: string | Buffer): void {
  mkdirSync(fixturesDir, { recursive: true });
  writeFileSync(fixturesPath(name), data);
}

export function updateGoldenEnabled(): boolean {
  return process.env.UPDATE_GOLDEN === "1" || process.env.UPDATE_SNAPSHOTS === "1";
}

export function assertGoldenText(name: string, actual: string): void {
  const path = fixturesPath(name);
  const normalized = normalizeSvg(actual);
  if (updateGoldenEnabled() || !existsSync(path)) {
    writeGolden(name, `${normalized}\n`);
    return;
  }
  const expected = normalizeSvg(readFileSync(path, "utf8"));
  expect(normalized).toBe(expected);
}

export function assertGoldenPng(name: string, actual: Buffer, maxDiffRatio = 0): void {
  const path = fixturesPath(name);
  if (updateGoldenEnabled() || !existsSync(path)) {
    writeGolden(name, actual);
    return;
  }
  const expected = readGoldenPng(name);
  const diff = comparePngBuffers(actual, expected, maxDiffRatio);
  expect(diff).toBeLessThanOrEqual(Math.ceil(expected.length * maxDiffRatio));
}

export function comparePngBuffers(
  actual: Buffer,
  expected: Buffer,
  maxDiffRatio = 0,
): number {
  const imgA = PNG.sync.read(actual);
  const imgB = PNG.sync.read(expected);
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    throw new Error(
      `PNG size mismatch: ${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}`,
    );
  }
  const diff = new PNG({ width: imgA.width, height: imgA.height });
  const diffPixels = pixelmatch(imgA.data, imgB.data, diff.data, imgA.width, imgA.height, {
    threshold: 0.1,
  });
  const ratio = diffPixels / (imgA.width * imgA.height);
  if (ratio > maxDiffRatio) {
    throw new Error(`Pixel diff ratio ${(ratio * 100).toFixed(2)}% exceeds ${maxDiffRatio * 100}%`);
  }
  return diffPixels;
}

export function decodeDataUrlPng(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}
