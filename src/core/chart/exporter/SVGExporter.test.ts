import { describe, it, expect } from "vitest";
import { exportToSVG } from "./SVGExporter";
import { LinearScale } from "../../../scales";
import type { Series } from "../../Series";
import type { ChartTheme } from "../../../theme";

const theme = {
  backgroundColor: "#111",
  grid: { visible: true, majorColor: "#333" },
  xAxis: {
    lineColor: "#ccc",
    lineWidth: 1,
    labelColor: "#eee",
    labelSize: 11,
    fontFamily: "sans-serif",
    tickLength: 4,
    tickColor: "#ccc",
  },
  yAxis: {
    lineColor: "#ccc",
    lineWidth: 1,
    labelColor: "#eee",
    labelSize: 11,
    fontFamily: "sans-serif",
    tickLength: 4,
    tickColor: "#ccc",
  },
} as ChartTheme;

function mockSeries(
  type: string,
  data: Record<string, Float32Array>,
  style: Record<string, unknown> = {},
): Series {
  return {
    isVisible: () => true,
    getYAxisId: () => undefined,
    getData: () => data,
    getStyle: () => style,
    getType: () => type,
  } as unknown as Series;
}

function exportWithSeries(series: Series[], gridVisible = true) {
  const xScale = new LinearScale();
  xScale.setDomain(0, 100);
  xScale.setRange(60, 460);
  const yScale = new LinearScale();
  yScale.setDomain(0, 60);
  yScale.setRange(280, 40);
  const plotArea = { x: 60, y: 40, width: 400, height: 240 };
  const exportTheme = { ...theme, grid: { ...theme.grid, visible: gridVisible } };

  return exportToSVG(
    series,
    { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
    plotArea,
    xScale,
    new Map([["default", yScale]]),
    exportTheme as ChartTheme,
    520,
    320,
    { xAxis: { tickCount: 4 }, yAxis: { tickCount: 4 }, primaryYAxisId: "default" },
  );
}

describe("exportToSVG", () => {
  it("returns SVG with line series, grid, and tick labels", () => {
    const svg = exportWithSeries([
      mockSeries(
        "line",
        { x: Float32Array.from([0, 50, 100]), y: Float32Array.from([10, 50, 30]) },
        { color: "#ff0055", width: 2 },
      ),
    ]);
    expect(svg).toContain("<polyline");
    expect(svg).toContain("<text");
    expect(svg).toContain('stroke="#ff0055"');
  });

  it("renders step, scatter, bar, band, and candlestick series", () => {
    const step = exportWithSeries([
      mockSeries(
        "step",
        { x: Float32Array.from([0, 50, 100]), y: Float32Array.from([10, 30, 20]) },
        { color: "#0f0", stepMode: "after" },
      ),
    ]);
    expect(step).toContain("<polyline");

    const scatter = exportWithSeries([
      mockSeries(
        "scatter",
        { x: Float32Array.from([25, 75]), y: Float32Array.from([15, 45]) },
        { color: "#00f", pointSize: 6 },
      ),
    ]);
    expect(scatter).toContain("<circle");

    const bar = exportWithSeries([
      mockSeries(
        "bar",
        { x: Float32Array.from([20, 60]), y: Float32Array.from([10, 30]) },
        { color: "#fa0", barWidth: 8 },
      ),
    ]);
    expect(bar).toContain("<rect");

    const band = exportWithSeries([
      mockSeries(
        "band",
        {
          x: Float32Array.from([0, 50, 100]),
          y: Float32Array.from([40, 50, 45]),
          y2: Float32Array.from([20, 25, 22]),
        },
        { color: "#aaf" },
      ),
    ]);
    expect(band).toContain("<polygon");

    const candle = exportWithSeries([
      mockSeries(
        "candlestick",
        {
          x: Float32Array.from([50]),
          y: Float32Array.from([0]),
          open: Float32Array.from([20]),
          high: Float32Array.from([30]),
          low: Float32Array.from([15]),
          close: Float32Array.from([25]),
        },
        { barWidth: 10 },
      ),
    ]);
    expect(candle).toContain("<line");
    expect(candle).toContain("#26a69a");
  });

  it("skips invisible series and hides grid when disabled", () => {
    const hidden = {
      isVisible: () => false,
      getYAxisId: () => undefined,
      getData: () => ({ x: Float32Array.from([0]), y: Float32Array.from([1]) }),
      getStyle: () => ({}),
      getType: () => "line",
    } as unknown as Series;

    const svg = exportWithSeries([hidden], false);
    expect(svg).not.toContain("<polyline");
    expect(svg).not.toContain("stroke-dasharray");
  });

  it("renders step modes and area series", () => {
    const before = exportWithSeries([
      mockSeries(
        "step",
        { x: Float32Array.from([0, 50, 100]), y: Float32Array.from([10, 30, 20]) },
        { color: "#0f0", stepMode: "before" },
      ),
    ]);
    expect(before).toContain("<polyline");

    const center = exportWithSeries([
      mockSeries(
        "step",
        { x: Float32Array.from([0, 50, 100]), y: Float32Array.from([10, 30, 20]) },
        { color: "#0f0", stepMode: "center" },
      ),
    ]);
    expect(center).toContain("<polyline");

    const area = exportWithSeries([
      mockSeries(
        "area",
        { x: Float32Array.from([0, 50, 100]), y: Float32Array.from([10, 30, 20]) },
        { color: "#aaf" },
      ),
    ]);
    expect(area).toContain("<polygon");
  });

  it("throws when no Y scale is available", () => {
    expect(() =>
      exportToSVG(
        [],
        { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
        { x: 0, y: 0, width: 100, height: 100 },
        new LinearScale(),
        new Map(),
        theme,
        100,
        100,
      ),
    ).toThrow(/Y scale/i);
  });

  it("renders bearish candlesticks and hides tick labels when requested", () => {
    const bear = exportWithSeries([
      mockSeries(
        "candlestick",
        {
          x: Float32Array.from([50]),
          y: Float32Array.from([0]),
          open: Float32Array.from([30]),
          high: Float32Array.from([32]),
          low: Float32Array.from([20]),
          close: Float32Array.from([22]),
        },
        { barWidth: 10 },
      ),
    ]);
    expect(bear).toContain("#ef5350");

    const xScale = new LinearScale();
    xScale.setDomain(0, 100);
    xScale.setRange(60, 460);
    const yScale = new LinearScale();
    yScale.setDomain(0, 60);
    yScale.setRange(280, 40);
    const hidden = exportToSVG(
      [mockSeries("line", { x: Float32Array.from([0, 50]), y: Float32Array.from([1, 2]) }, { color: "#fff" })],
      { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
      { x: 60, y: 40, width: 400, height: 240 },
      xScale,
      new Map([["default", yScale]]),
      theme,
      520,
      320,
      { xAxis: { tickCount: 4, showLabels: false }, yAxis: { tickCount: 4, showLabels: false } },
    );
    expect(hidden).not.toContain("<text");
  });
});
