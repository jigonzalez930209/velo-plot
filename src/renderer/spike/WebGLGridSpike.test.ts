import { describe, it, expect } from "vitest";
import { buildGridLineVertices } from "./WebGLGridSpike";

describe("WebGLGridSpike", () => {
  it("buildGridLineVertices produces 2 verts per line segment", () => {
    const verts = buildGridLineVertices({
      plotArea: { x: 10, y: 10, width: 200, height: 100 },
      xLines: [50, 100, 150],
      yLines: [30, 60],
      width: 400,
      height: 300,
    });
    expect(verts.length).toBe((3 + 2) * 4);
    expect(verts[0]).toBe(50);
    expect(verts[1]).toBe(10);
    expect(verts[3]).toBe(110);
  });
});
