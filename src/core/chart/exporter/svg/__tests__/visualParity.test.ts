import { describe, it, expect } from "vitest";
import { LinearScale } from "../../../../../scales";
import { buildSVGExportContext } from "../SVGExportContext";
import { renderSVG } from "../SVGOrchestrator";
import type { Series } from "../../../../Series";
import type { ChartTheme } from "../../../../../theme";

const theme = {
  backgroundColor: "#111",
  grid: { visible: true, majorColor: "#333", majorWidth: 1, minorColor: "#222", minorWidth: 1, showMinor: false, minorDivisions: 4, majorDash: [], minorDash: [] },
  xAxis: { lineColor: "#ccc", lineWidth: 1, labelColor: "#eee", labelSize: 11, fontFamily: "sans-serif", tickLength: 4, tickColor: "#ccc", titleColor: "#fff", titleSize: 12 },
  yAxis: { lineColor: "#ccc", lineWidth: 1, labelColor: "#eee", labelSize: 11, fontFamily: "sans-serif", tickLength: 4, tickColor: "#ccc", titleColor: "#fff", titleSize: 12 },
  plotBorderColor: "#444",
  legend: { visible: false, position: "top-right", backgroundColor: "#222", borderColor: "#333", borderRadius: 4, textColor: "#eee", fontSize: 11, fontFamily: "sans-serif", padding: 8, itemGap: 4, swatchSize: 12 },
  cursor: { lineColor: "#fff" },
} as ChartTheme;

function mockSeries(type: string): Series {
  return {
    isVisible: () => true,
    getYAxisId: () => undefined,
    getId: () => "s1",
    getName: () => type,
    getData: () => ({ x: Float32Array.from([0, 50, 100]), y: Float32Array.from([10, 30, 20]) }),
    getStyle: () => ({ color: "#f00", width: 2 }),
    getType: () => type,
    hasErrorData: () => false,
  } as unknown as Series;
}

function renderType(type: string): string {
  const xScale = new LinearScale();
  xScale.setDomain(0, 100);
  xScale.setRange(60, 460);
  const yScale = new LinearScale();
  yScale.setDomain(0, 60);
  yScale.setRange(280, 40);
  return renderSVG(
    buildSVGExportContext({
      series: [mockSeries(type)],
      viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
      plotArea: { x: 60, y: 40, width: 400, height: 240 },
      xScale,
      yAxes: new Map([["default", yScale]]),
      theme,
      width: 520,
      height: 320,
    }),
  );
}

/** Structural parity smoke — each series type must emit non-empty vector content. */
describe("SVG visual parity smoke", () => {
  const types = ["line", "scatter", "bar", "band", "candlestick", "step", "heatmap", "gauge", "sankey"];

  for (const type of types) {
    it(`exports non-empty vector markup for ${type}`, () => {
      const svg = renderType(type);
      expect(svg).toContain("<svg");
      expect(svg).not.toContain('xlink:href="data:');
      expect(svg.length).toBeGreaterThan(200);
    });
  }
});
