/**
 * Contour Plot Generation (Marching Squares)
 */

export interface ContourPoint {
  x: number;
  y: number;
}

export interface ContourLine {
  level: number;
  points: ContourPoint[];
  /** Joined polylines (populated when `joinPaths` is enabled). */
  polylines?: ContourPoint[][];
  /** Suggested isoline label placements (populated when `labels` is enabled). */
  labels?: ContourLabel[];
}

/** A placed label for an isoline, including rotation to follow the line. */
export interface ContourLabel {
  x: number;
  y: number;
  level: number;
  /** Text of the label (formatted level value). */
  text: string;
  /** Rotation angle in radians so the label follows the contour direction. */
  angle: number;
}

export interface ContourOptions {
  levels?: number[];
  numLevels?: number;
  /** Join marching-squares segments into continuous polylines. */
  joinPaths?: boolean;
  /** Compute isoline label placements (implies `joinPaths`). */
  labels?: boolean;
  /**
   * Minimum polyline length (in polyline vertices) required to receive a label.
   * Prevents cluttering short/noisy isolines. Default: 6.
   */
  minLabelLength?: number;
  /** Formatter for label text. Default: fixed to 2 significant decimals. */
  labelFormatter?: (level: number) => string;
}

/**
 * Generate contour lines from a 2D grid of values
 * Values are assumed to be in row-major order: z = values[y * width + x]
 */
export function generateContours(
  z: Float32Array | number[],
  xValues: Float32Array | number[],
  yValues: Float32Array | number[],
  options: ContourOptions = {}
): ContourLine[] {
  const width = xValues.length;
  const height = yValues.length;
  
  const minZ = Math.min(...z);
  const maxZ = Math.max(...z);
  
  const levels = options.levels || calculateLevels(minZ, maxZ, options.numLevels || 10);
  const result: ContourLine[] = [];

  for (const level of levels) {
    const segments: Array<[number, number, number, number]> = [];
    
    // Process each cell
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const v0 = z[y * width + x];
        const v1 = z[y * width + (x + 1)];
        const v2 = z[(y + 1) * width + (x + 1)];
        const v3 = z[(y + 1) * width + x];
        
        processCell(x, y, v0, v1, v2, v3, level, xValues, yValues, segments);
      }
    }
    
    if (segments.length > 0) {
      // Flat segment list (backwards-compatible: pairs of points).
      const points: ContourPoint[] = [];
      for (const seg of segments) {
        points.push({ x: seg[0], y: seg[1] });
        points.push({ x: seg[2], y: seg[3] });
      }

      const line: ContourLine = { level, points };

      if (options.joinPaths || options.labels) {
        const polylines = joinSegments(segments);
        line.polylines = polylines;

        if (options.labels) {
          line.labels = placeLabels(
            polylines,
            level,
            options.minLabelLength ?? 6,
            options.labelFormatter ?? defaultLabelFormatter
          );
        }
      }

      result.push(line);
    }
  }

  return result;
}

/**
 * Join disjoint marching-squares segments into continuous polylines by
 * chaining segments whose endpoints coincide (within a tolerance). This yields
 * smooth isolines suitable for labeling (task 3.13).
 */
export function joinSegments(
  segments: Array<[number, number, number, number]>,
  tolerance = 1e-6
): ContourPoint[][] {
  const remaining = segments.map((s) => ({
    a: { x: s[0], y: s[1] },
    b: { x: s[2], y: s[3] },
    used: false,
  }));

  const key = (p: ContourPoint) => `${Math.round(p.x / tolerance)}:${Math.round(p.y / tolerance)}`;
  const close = (p: ContourPoint, q: ContourPoint) =>
    Math.abs(p.x - q.x) <= tolerance && Math.abs(p.y - q.y) <= tolerance;

  // Index segment endpoints for O(1)-ish lookup.
  const index = new Map<string, number[]>();
  remaining.forEach((seg, i) => {
    for (const p of [seg.a, seg.b]) {
      const k = key(p);
      if (!index.has(k)) index.set(k, []);
      index.get(k)!.push(i);
    }
  });

  const polylines: ContourPoint[][] = [];

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].used) continue;
    remaining[i].used = true;
    const path: ContourPoint[] = [remaining[i].a, remaining[i].b];

    // Extend forward from the tail.
    let extended = true;
    while (extended) {
      extended = false;
      const tail = path[path.length - 1];
      const candidates = index.get(key(tail)) ?? [];
      for (const j of candidates) {
        if (remaining[j].used) continue;
        const seg = remaining[j];
        if (close(seg.a, tail)) {
          path.push(seg.b);
          seg.used = true;
          extended = true;
          break;
        } else if (close(seg.b, tail)) {
          path.push(seg.a);
          seg.used = true;
          extended = true;
          break;
        }
      }
    }

    // Extend backward from the head.
    extended = true;
    while (extended) {
      extended = false;
      const head = path[0];
      const candidates = index.get(key(head)) ?? [];
      for (const j of candidates) {
        if (remaining[j].used) continue;
        const seg = remaining[j];
        if (close(seg.b, head)) {
          path.unshift(seg.a);
          seg.used = true;
          extended = true;
          break;
        } else if (close(seg.a, head)) {
          path.unshift(seg.b);
          seg.used = true;
          extended = true;
          break;
        }
      }
    }

    polylines.push(path);
  }

  return polylines;
}

function defaultLabelFormatter(level: number): string {
  const abs = Math.abs(level);
  if (abs !== 0 && (abs < 0.01 || abs >= 1e5)) return level.toExponential(1);
  return level.toFixed(2).replace(/\.00$/, '');
}

/**
 * Place one label near the arc-length midpoint of each sufficiently long
 * polyline, rotated to follow the local isoline direction so it reads naturally
 * at different zoom levels. The tangent is estimated over a small window of
 * neighbouring vertices (rather than the two immediate neighbours) so the angle
 * is smooth and the label doesn't jitter on wiggly isolines.
 */
function placeLabels(
  polylines: ContourPoint[][],
  level: number,
  minLength: number,
  formatter: (level: number) => string
): ContourLabel[] {
  const labels: ContourLabel[] = [];
  const text = formatter(level);

  for (const line of polylines) {
    if (line.length < minLength) continue;

    // Find the vertex closest to the polyline's arc-length midpoint so the label
    // sits on the visual middle of the isoline even when vertices are unevenly
    // spaced (marching-squares output clusters points near saddles).
    let total = 0;
    for (let i = 1; i < line.length; i++) {
      total += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y);
    }
    const half = total / 2;
    let acc = 0;
    let midIdx = Math.floor(line.length / 2);
    for (let i = 1; i < line.length; i++) {
      acc += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y);
      if (acc >= half) {
        midIdx = i;
        break;
      }
    }

    const p = line[midIdx];
    // Smooth tangent over a window of ±win vertices.
    const win = Math.min(3, Math.floor(line.length / 4)) || 1;
    const prev = line[Math.max(0, midIdx - win)];
    const next = line[Math.min(line.length - 1, midIdx + win)];

    let angle = Math.atan2(next.y - prev.y, next.x - prev.x);
    // Keep text upright (avoid upside-down labels).
    if (angle > Math.PI / 2) angle -= Math.PI;
    if (angle < -Math.PI / 2) angle += Math.PI;

    labels.push({ x: p.x, y: p.y, level, text, angle });
  }

  return labels;
}

function calculateLevels(min: number, max: number, n: number): number[] {
  const levels = [];
  const step = (max - min) / (n + 1);
  for (let i = 1; i <= n; i++) {
    levels.push(min + i * step);
  }
  return levels;
}

/**
 * Process a single cell using Marching Squares
 */
function processCell(
  x: number, y: number,
  v0: number, v1: number, v2: number, v3: number,
  level: number,
  xScale: any, yScale: any,
  segments: Array<[number, number, number, number]>
) {
  let caseIndex = 0;
  if (v0 >= level) caseIndex |= 1;
  if (v1 >= level) caseIndex |= 2;
  if (v2 >= level) caseIndex |= 4;
  if (v3 >= level) caseIndex |= 8;

  if (caseIndex === 0 || caseIndex === 15) return;

  // Interpolation helpers
  const lerp = (v0: number, v1: number, t: number) => v0 + (v1 - v0) * t;
  const getT = (v0: number, v1: number) => (level - v0) / (v1 - v0);

  // Edges: 0 (top), 1 (right), 2 (bottom), 3 (left)
  const getPoint = (edge: number): [number, number] => {
    switch (edge) {
      case 0: return [lerp(xScale[x], xScale[x + 1], getT(v0, v1)), yScale[y]];
      case 1: return [xScale[x + 1], lerp(yScale[y], yScale[y + 1], getT(v1, v2))];
      case 2: return [lerp(xScale[x], xScale[x + 1], getT(v3, v2)), yScale[y + 1]];
      case 3: return [xScale[x], lerp(yScale[y], yScale[y + 1], getT(v0, v3))];
      default: return [0, 0];
    }
  };

  const addSeg = (e1: number, e2: number) => {
    const p1 = getPoint(e1);
    const p2 = getPoint(e2);
    segments.push([p1[0], p1[1], p2[0], p2[1]]);
  };

  // Case table
  switch (caseIndex) {
    case 1: case 14: addSeg(0, 3); break;
    case 2: case 13: addSeg(0, 1); break;
    case 3: case 12: addSeg(1, 3); break;
    case 4: case 11: addSeg(1, 2); break;
    case 5: addSeg(0, 1); addSeg(2, 3); break; // Ambiguous
    case 6: case 9: addSeg(0, 2); break;
    case 7: case 8: addSeg(2, 3); break;
    case 10: addSeg(0, 3); addSeg(1, 2); break; // Ambiguous
  }
}
