import { describe, it, expect } from "vitest";
import { LinearScale } from "../../../../../scales";
import { buildStepPoints } from "../series/line";
import { interleaveStepData } from "../../../../../renderer/native/utilsCore";

describe("SVG step series", () => {
  const x = Float32Array.from([0, 10, 25, 40]);
  const y = Float32Array.from([5, 20, 12, 30]);

  function pixelPath(mode: "before" | "after" | "center"): Array<[number, number]> {
    const xScale = new LinearScale();
    xScale.setDomain(0, 50);
    xScale.setRange(0, 500);
    const yScale = new LinearScale();
    yScale.setDomain(0, 40);
    yScale.setRange(400, 0);

    return buildStepPoints({ x, y }, xScale, yScale, mode).map((pair) => {
      const [px, py] = pair.split(",").map(Number);
      return [px, py] as [number, number];
    });
  }

  function webglPixelPath(mode: "before" | "after" | "center"): Array<[number, number]> {
    const xScale = new LinearScale();
    xScale.setDomain(0, 50);
    xScale.setRange(0, 500);
    const yScale = new LinearScale();
    yScale.setDomain(0, 40);
    yScale.setRange(400, 0);

    const interleaved = interleaveStepData(x, y, mode);
    const out: Array<[number, number]> = [];
    for (let i = 0; i < interleaved.length; i += 2) {
      out.push([xScale.transform(interleaved[i]), yScale.transform(interleaved[i + 1])]);
    }
    return out;
  }

  for (const mode of ["after", "before", "center"] as const) {
    it(`buildStepPoints matches WebGL interleaveStepData (${mode})`, () => {
      expect(pixelPath(mode)).toEqual(webglPixelPath(mode));
    });
  }

  it("after mode uses horizontal then vertical segments (no diagonals)", () => {
    const pts = pixelPath("after");
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const horizontal = y0 === y1;
      const vertical = x0 === x1;
      expect(horizontal || vertical).toBe(true);
    }
  });
});
