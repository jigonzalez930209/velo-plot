import { describe, it, expect } from "vitest";
import { buildIndicatorSeries, detectIndicatorMarkers } from "./buildIndicatorSeries";

describe("buildIndicatorSeries", () => {
  it("expands histogram into positive and negative bar series", () => {
    const series = buildIndicatorSeries({
      id: "macd",
      type: "indicator",
      data: {
        x: new Float32Array([1, 2, 3]),
        histogram: { y: new Float32Array([2, -1, 3]) },
      },
    });
    const ids = series.map((s) => s.id);
    expect(ids).toContain("macd-hist-pos");
    expect(ids).toContain("macd-hist-neg");
    expect(ids).toContain("macd-baseline");
  });

  it("includes lines, fills, and markers", () => {
    const series = buildIndicatorSeries({
      id: "wt",
      type: "indicator",
      data: {
        x: new Float32Array([10, 20, 30, 40]),
        lines: [{ y: new Float32Array([1, 2, 1, 0]) }],
        fills: [{ upper: new Float32Array([5, 5, 5, 5]), lower: new Float32Array([-5, -5, -5, -5]) }],
        markers: [{ x: 20, y: 2, kind: "peak" }],
      },
    });
    expect(series.some((s) => s.type === "line")).toBe(true);
    expect(series.some((s) => s.type === "band")).toBe(true);
    expect(series.some((s) => s.type === "scatter")).toBe(true);
  });

  it("splits a line into colored segments for buy/sell zones", () => {
    const series = buildIndicatorSeries({
      id: "wave",
      type: "indicator",
      data: {
        x: new Float32Array([0, 1, 2, 3, 4]),
        lines: [
          {
            id: "fast",
            y: new Float32Array([2, 1, -1, -2, 1]),
            colorZones: {
              ref: "zero",
              aboveColor: "#26a69a",
              belowColor: "#ef5350",
            },
          },
        ],
      },
    });

    const zoneLines = series.filter(
      (s) => s.type === "line" && String(s.id).includes("fast-zone"),
    );
    expect(zoneLines.length).toBeGreaterThan(1);
    const colors = new Set(zoneLines.map((s) => (s.style as { color?: string }).color));
    expect(colors.has("#26a69a")).toBe(true);
    expect(colors.has("#ef5350")).toBe(true);
  });

  it("colors line segments relative to another line layer", () => {
    const series = buildIndicatorSeries({
      id: "cross",
      type: "indicator",
      data: {
        x: new Float32Array([0, 1, 2, 3]),
        lines: [
          { id: "a", y: new Float32Array([0, 2, 0, -2]) },
          {
            id: "b",
            y: new Float32Array([1, 1, 1, 1]),
            colorZones: {
              ref: "a",
              aboveColor: "#00e5ff",
              belowColor: "#e040fb",
            },
          },
        ],
      },
    });

    expect(series.some((s) => String(s.id).includes("b-zone"))).toBe(true);
  });
});

describe("detectIndicatorMarkers", () => {
  it("finds local peaks", () => {
    const x = new Float32Array([0, 1, 2, 3, 4]);
    const y = new Float32Array([0, 2, 5, 2, 0]);
    const markers = detectIndicatorMarkers(x, y, 1);
    expect(markers.some((m) => m.kind === "peak" && m.x === 2)).toBe(true);
  });

  it("finds local troughs", () => {
    const x = new Float32Array([0, 1, 2, 3, 4]);
    const y = new Float32Array([5, 2, 0, 2, 5]);
    const markers = detectIndicatorMarkers(x, y, 1);
    expect(markers.some((m) => m.kind === "trough" && m.x === 2)).toBe(true);
  });

  it("renders trough marker series and default reference line styles", () => {
    const series = buildIndicatorSeries({
      id: "m",
      type: "indicator",
      data: {
        x: new Float32Array([0, 1, 2]),
        lines: [{ y: new Float32Array([1, 2, 1]) }],
        markers: [{ x: 1, y: 2, kind: "trough" }],
        referenceLines: [{ y: 50 }],
      },
    });
    expect(series.some((s) => s.id === "m-troughs")).toBe(true);
    expect(series.some((s) => s.id === "m-ref-0")).toBe(true);
  });
});
