import type { Scale } from "../../../../../scales";
import { fmt } from "../SVGDocumentBuilder";

/** Indices where x/y (and optional y2) are finite. */
export function collectFiniteIndices(
  x: Float32Array | Float64Array,
  y: Float32Array | Float64Array,
  y2?: Float32Array | Float64Array,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < x.length; i++) {
    if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) continue;
    if (y2 && !Number.isFinite(y2[i])) continue;
    out.push(i);
  }
  return out;
}

/** Split finite samples into contiguous polyline segments (breaks at NaN gaps). */
export function buildLineSegments(
  indices: number[],
  x: Float32Array | Float64Array,
  y: Float32Array | Float64Array,
  xScale: Scale,
  yScale: Scale,
): string[][] {
  const segments: string[][] = [];
  let current: string[] = [];
  let prev = -2;

  for (const i of indices) {
    if (prev >= 0 && i !== prev + 1) {
      if (current.length >= 2) segments.push(current);
      current = [];
    }
    current.push(`${fmt(xScale.transform(x[i]))},${fmt(yScale.transform(y[i]))}`);
    prev = i;
  }

  if (current.length >= 2) segments.push(current);
  return segments;
}
