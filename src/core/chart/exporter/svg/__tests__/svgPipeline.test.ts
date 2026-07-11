import { describe, it, expect } from "vitest";
import { LinearScale } from "../../../../../scales";
import type { Series } from "../../../../Series";
import type { ChartTheme } from "../../../../../theme";
import { buildSVGExportContext } from "../SVGExportContext";
import { renderSVG } from "../SVGOrchestrator";
import { exportGrid } from "../overlay/grid";
import { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { symbolSvg } from "../symbols";
import { getRegisteredSeriesTypes } from "../series/registry";

const theme = {
  backgroundColor: "#111",
  grid: { visible: true, majorColor: "#333", majorWidth: 1, minorColor: "#222", minorWidth: 1, showMinor: true, minorDivisions: 4, majorDash: [], minorDash: [2, 2] },
  xAxis: { lineColor: "#ccc", lineWidth: 1, labelColor: "#eee", labelSize: 11, fontFamily: "sans-serif", tickLength: 4, tickColor: "#ccc", titleColor: "#fff", titleSize: 12 },
  yAxis: { lineColor: "#ccc", lineWidth: 1, labelColor: "#eee", labelSize: 11, fontFamily: "sans-serif", tickLength: 4, tickColor: "#ccc", titleColor: "#fff", titleSize: 12 },
  plotBorderColor: "#444",
  legend: { visible: true, position: "top-right", backgroundColor: "#222", borderColor: "#333", borderRadius: 4, textColor: "#eee", fontSize: 11, fontFamily: "sans-serif", padding: 8, itemGap: 4, swatchSize: 12 },
  cursor: { lineColor: "#fff" },
} as ChartTheme;

function mockSeries(type: string, data: Record<string, Float32Array>, style: Record<string, unknown> = {}): Series {
  return {
    isVisible: () => true,
    getYAxisId: () => undefined,
    getId: () => `mock-${type}`,
    getName: () => type,
    getData: () => data,
    getStyle: () => style,
    getType: () => type,
    hasErrorData: () => false,
    getMarkers: () => [],
  } as unknown as Series;
}

function baseContext(series: Series[]) {
  const xScale = new LinearScale();
  xScale.setDomain(0, 100);
  xScale.setRange(60, 460);
  const yScale = new LinearScale();
  yScale.setDomain(0, 60);
  yScale.setRange(280, 40);
  return buildSVGExportContext({
    series,
    viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
    plotArea: { x: 60, y: 40, width: 400, height: 240 },
    xScale,
    yAxes: new Map([["default", yScale]]),
    theme,
    width: 520,
    height: 320,
    xAxisOptions: { tickCount: 4 },
    yAxisOptionsMap: new Map([["default", { tickCount: 4 }]]),
    primaryYAxisId: "default",
    titleOptions: { visible: true, text: "Test Chart" },
    showLegend: true,
  });
}

describe("SVG pipeline v2", () => {
  it("registers all core series types", () => {
    const types = getRegisteredSeriesTypes();
    expect(types).toContain("line");
    expect(types).toContain("heatmap");
    expect(types).toContain("indicator");
    expect(types.length).toBeGreaterThanOrEqual(17);
  });

  it("renders chart title and plot border", () => {
    const svg = renderSVG(baseContext([mockSeries("line", { x: Float32Array.from([0, 50]), y: Float32Array.from([10, 30]) }, { color: "#f00" })]));
    expect(svg).toContain("Test Chart");
    expect(svg).toContain('stroke="#444"');
  });

  it("renders all scatter symbol paths", () => {
    const symbols = ["circle", "square", "diamond", "triangle", "triangleDown", "cross", "x", "star"];
    for (const symbol of symbols) {
      const el = symbolSvg(symbol, 10, 10, 8, "#f00");
      expect(el.length).toBeGreaterThan(5);
    }
  });

  it("renders minor grid when enabled", () => {
    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    exportGrid(baseContext([]), builder);
    const partial = builder.build("#111");
    expect(partial).toContain("<line");
  });

  it("exports line+scatter composite", () => {
    const svg = renderSVG(
      baseContext([
        mockSeries(
          "line+scatter",
          { x: Float32Array.from([0, 50, 100]), y: Float32Array.from([10, 30, 20]) },
          { color: "#0af", symbol: "diamond", pointSize: 8 },
        ),
      ]),
    );
    expect(svg).toContain("<polyline");
    expect(svg).toContain("<polygon");
  });
});
