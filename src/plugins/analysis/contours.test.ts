import { describe, it, expect } from "vitest";
import { generateContours, joinSegments } from "./contours";

// A simple radial bump on a grid so contours form closed loops.
function radialGrid(size: number): { z: number[]; xs: number[]; ys: number[] } {
  const z: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < size; i++) {
    xs.push(i);
    ys.push(i);
  }
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x - c) ** 2 + (y - c) ** 2);
      z.push(Math.max(0, 10 - d));
    }
  }
  return { z, xs, ys };
}

describe("contour isoline joining and labels (3.13)", () => {
  const { z, xs, ys } = radialGrid(21);

  it("generates flat segment lists by default", () => {
    const lines = generateContours(z, xs, ys, { numLevels: 4 });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].points.length).toBeGreaterThan(0);
    expect(lines[0].polylines).toBeUndefined();
  });

  it("joins segments into continuous polylines", () => {
    const lines = generateContours(z, xs, ys, { numLevels: 4, joinPaths: true });
    const withPolys = lines.find((l) => l.polylines && l.polylines.length > 0);
    expect(withPolys).toBeDefined();
    // Each polyline should have more vertices than a single 2-point segment.
    const longest = withPolys!.polylines!.reduce((m, p) => Math.max(m, p.length), 0);
    expect(longest).toBeGreaterThan(2);
  });

  it("places isoline labels with an orientation angle", () => {
    const lines = generateContours(z, xs, ys, { numLevels: 5, labels: true, minLabelLength: 4 });
    const labeled = lines.find((l) => l.labels && l.labels.length > 0);
    expect(labeled).toBeDefined();
    const label = labeled!.labels![0];
    expect(typeof label.x).toBe("number");
    expect(typeof label.y).toBe("number");
    expect(Number.isFinite(label.angle)).toBe(true);
    // Angle kept upright within [-pi/2, pi/2].
    expect(Math.abs(label.angle)).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
    expect(label.text.length).toBeGreaterThan(0);
  });

  it("joinSegments chains a broken square into one closed loop", () => {
    const segs: Array<[number, number, number, number]> = [
      [0, 0, 1, 0],
      [1, 0, 1, 1],
      [1, 1, 0, 1],
      [0, 1, 0, 0],
    ];
    const polys = joinSegments(segs);
    expect(polys).toHaveLength(1);
    // 4 segments chained -> 5 vertices (closed loop returns to start).
    expect(polys[0].length).toBe(5);
  });
});
