import { describe, it, expect } from "vitest";
import { LinearScale } from "../../../../../scales";
import {
  generateMinorTicks,
  filterBusinessDayXTicks,
  resolveXTicks,
  resolveGridXTicks,
  primaryYScale,
  resolveYScale,
} from "../tickUtils";
import { exportErrorBarsForSeries } from "../overlay/errorBars";
import { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import type { Series } from "../../../../Series";

describe("tickUtils", () => {
  it("generateMinorTicks subdivides major intervals", () => {
    expect(generateMinorTicks([0, 10, 20], 4)).toEqual([2.5, 5, 7.5, 12.5, 15, 17.5]);
    expect(generateMinorTicks([0], 4)).toEqual([]);
  });

  it("filterBusinessDayXTicks deduplicates business day indices", () => {
    const mapping = {
      timeByIndex: [1000, 2000, 3000],
      indexByTime: new Map(),
    };
    expect(filterBusinessDayXTicks([0.4, 1.1, 1.2, 5], mapping)).toEqual([0, 1]);
    expect(filterBusinessDayXTicks([0, 1], null)).toEqual([0, 1]);
    expect(filterBusinessDayXTicks([0], { timeByIndex: [], indexByTime: new Map() })).toEqual([]);
  });

  it("resolveXTicks and resolveGridXTicks use scale ticks", () => {
    const xScale = new LinearScale();
    xScale.setDomain(0, 100);
    xScale.setRange(0, 500);
    expect(resolveGridXTicks(xScale, 5).length).toBeGreaterThan(0);
    expect(resolveXTicks(xScale, 5, null).length).toBeGreaterThan(0);
  });

  it("resolveYScale falls back to primary and first axis", () => {
    const y1 = new LinearScale();
    const y2 = new LinearScale();
    const map = new Map([
      ["default", y1],
      ["right", y2],
    ]);
    expect(primaryYScale(map, "right")).toBe(y2);
    expect(resolveYScale(map, "missing", "default")).toBe(y1);
    expect(primaryYScale(new Map([["only", y1]]))).toBe(y1);
  });
});

describe("errorBars exporter branches", () => {
  it("exports horizontal and vertical error bars with caps", () => {
    const xScale = new LinearScale();
    xScale.setDomain(0, 100);
    xScale.setRange(60, 460);
    const yScale = new LinearScale();
    yScale.setDomain(0, 60);
    yScale.setRange(280, 40);

    const series = {
      isVisible: () => true,
      hasErrorData: () => true,
      getData: () => ({
        x: Float32Array.from([50]),
        y: Float32Array.from([30]),
      }),
      getStyle: () => ({
        color: "#f00",
        errorBars: { direction: "both", showCaps: true, capWidth: 8 },
      }),
      getYError: () => [2, 3] as [number, number],
      getXError: () => [4, 5] as [number, number],
      getId: () => "err",
    } as unknown as Series;

    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    exportErrorBarsForSeries(
      series,
      { x: 60, y: 40, width: 400, height: 240 },
      xScale,
      yScale,
      builder,
    );
    const svg = builder.build("#111");
    expect(svg).toContain("vp-clip-eb-err");
    expect(svg.match(/<line/g)?.length).toBeGreaterThan(4);
  });
});
