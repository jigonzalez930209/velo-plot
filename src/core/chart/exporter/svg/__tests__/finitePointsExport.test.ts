import { describe, it, expect } from "vitest";
import { LinearScale } from "../../../../../scales";
import { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { exportLineSeries } from "../series/line";
import { exportBandSeries } from "../series/band";
import { exportHeatmapSeries } from "../series/heatmap";
import { exportAnnotations } from "../plugins/annotations";
import { mockSeries } from "./testFixtures";

describe("SVG finite point export", () => {
  const plotArea = { x: 50, y: 30, width: 400, height: 240 };

  it("exports indicator-style lines that start with NaN (EMA/SMA)", () => {
    const xScale = new LinearScale();
    xScale.setDomain(0, 100);
    xScale.setRange(60, 460);
    const yScale = new LinearScale();
    yScale.setDomain(80, 120);
    yScale.setRange(260, 40);

    const y = Float32Array.from({ length: 30 }, (_, i) => (i < 5 ? NaN : 100 + i * 0.2));
    const series = mockSeries("line", {
      id: "ema",
      data: { x: Float32Array.from({ length: 30 }, (_, i) => i * 3), y },
      style: { color: "#ffd54f", width: 1.5 },
    });

    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    exportLineSeries(series, plotArea, xScale, yScale, builder);
    const svg = builder.build("#111");

    expect(svg).toContain("polyline");
    expect(svg).toContain("#ffd54f");
    expect(svg).not.toContain("NaN");
  });

  it("exports Bollinger band when leading values are NaN", () => {
    const xScale = new LinearScale();
    xScale.setDomain(0, 100);
    xScale.setRange(60, 460);
    const yScale = new LinearScale();
    yScale.setDomain(80, 120);
    yScale.setRange(260, 40);

    const n = 25;
    const x = Float32Array.from({ length: n }, (_, i) => i * 4);
    const upper = Float32Array.from({ length: n }, (_, i) => (i < 4 ? NaN : 105 + i * 0.1));
    const lower = Float32Array.from({ length: n }, (_, i) => (i < 4 ? NaN : 95 + i * 0.1));

    const series = mockSeries("band", {
      id: "bb",
      data: { x, y: upper, y2: lower },
      style: { color: "rgba(100, 80, 180, 0.25)", opacity: 0.35 },
    });

    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    exportBandSeries(series, plotArea, xScale, yScale, builder);
    const svg = builder.build("#111");

    expect(svg).toContain("polygon");
    expect(svg).not.toContain("NaN");
  });

  it("exports heatmap grid using colorScale name and fixed z range", () => {
    const xScale = new LinearScale();
    xScale.setDomain(0, 3);
    xScale.setRange(60, 460);
    const yScale = new LinearScale();
    yScale.setDomain(0, 2);
    yScale.setRange(260, 40);

    const series = mockSeries("heatmap", {
      id: "hm",
      heatmapData: {
        xValues: Float32Array.from([0, 1, 2, 3]),
        yValues: Float32Array.from([0, 1, 2]),
        zValues: Float32Array.from([0, 0.5, 1, 0, 0.25, 0.75, -0.5, -0.25, 0, 0.1, 0.2, 0.3]),
      },
      style: { colorScale: { name: "viridis", min: -1, max: 1 } },
    });

    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    exportHeatmapSeries(series, plotArea, xScale, yScale, builder);
    const svg = builder.build("#111");

    expect(svg).toContain("<rect");
    const dataRects = svg.match(/<rect clip-path/g) ?? [];
    expect(dataRects.length).toBe(12);
  });

  it("arrow marker uses annotation stroke color, not hardcoded red", () => {
    const xScale = new LinearScale();
    xScale.setDomain(0, 100);
    xScale.setRange(60, 460);
    const yScale = new LinearScale();
    yScale.setDomain(0, 60);
    yScale.setRange(260, 40);

    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    exportAnnotations(
      {
        series: [],
        viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
        plotArea,
        xScale,
        yScales: new Map([["default", yScale]]),
        theme: {} as never,
        width: 520,
        height: 320,
        builder,
      },
      [{ id: "trend", type: "arrow", x1: 10, y1: 20, x2: 80, y2: 50, color: "#00e5ff" }],
    );
    const svg = builder.build("#111");

    expect(svg).toContain('fill="#00e5ff"');
    expect(svg).toContain('stroke="#00e5ff"');
    expect(svg).not.toContain('fill="#ff0055"');
  });
});
