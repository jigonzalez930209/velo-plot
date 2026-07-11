import { describe, it, expect } from "vitest";
import { exportToSVG, exportChartToSVG, exportChartSnapshot } from "./SVGExporter";
import { LinearScale } from "../../../scales";
import type { Series } from "../../Series";
import type { ChartTheme } from "../../../theme";
import { mockSeries, testScales, testTheme } from "./svg/__tests__/testFixtures";

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

function localMockSeries(
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

function mockSeriesWithAxis(
  type: string,
  yAxisId: string,
  data: Record<string, Float32Array>,
  style: Record<string, unknown> = {},
): Series {
  return {
    isVisible: () => true,
    getYAxisId: () => yAxisId,
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
      localMockSeries(
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
      localMockSeries(
        "step",
        { x: Float32Array.from([0, 50, 100]), y: Float32Array.from([10, 30, 20]) },
        { color: "#0f0", stepMode: "after" },
      ),
    ]);
    expect(step).toContain("<polyline");

    const scatter = exportWithSeries([
      localMockSeries(
        "scatter",
        { x: Float32Array.from([25, 75]), y: Float32Array.from([15, 45]) },
        { color: "#00f", pointSize: 6 },
      ),
    ]);
    expect(scatter).toContain("<circle");

    const bar = exportWithSeries([
      localMockSeries(
        "bar",
        { x: Float32Array.from([20, 60]), y: Float32Array.from([10, 30]) },
        { color: "#fa0", barWidth: 8 },
      ),
    ]);
    expect(bar).toContain("<rect");

    const band = exportWithSeries([
      localMockSeries(
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
      localMockSeries(
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
      localMockSeries(
        "step",
        { x: Float32Array.from([0, 50, 100]), y: Float32Array.from([10, 30, 20]) },
        { color: "#0f0", stepMode: "before" },
      ),
    ]);
    expect(before).toContain("<polyline");

    const center = exportWithSeries([
      localMockSeries(
        "step",
        { x: Float32Array.from([0, 50, 100]), y: Float32Array.from([10, 30, 20]) },
        { color: "#0f0", stepMode: "center" },
      ),
    ]);
    expect(center).toContain("<polyline");

    const area = exportWithSeries([
      localMockSeries(
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

  it("falls back to defaults for missing styles, theme props, and options", () => {
    const minimalTheme = {
      backgroundColor: "#000",
      grid: { visible: true, majorColor: "#222" },
      xAxis: { lineColor: "#ccc", labelColor: "#eee", labelSize: 10, fontFamily: "" },
      yAxis: { lineColor: "#ccc", labelColor: "#eee", labelSize: 10, fontFamily: "" },
    } as unknown as ChartTheme;

    // Scales whose pixel range extends past the plot area so some ticks fall
    // outside and hit the skip branches.
    const xScale = new LinearScale();
    xScale.setDomain(0, 100);
    xScale.setRange(0, 520);
    const yScale = new LinearScale();
    yScale.setDomain(0, 60);
    yScale.setRange(320, 0);
    const altScale = new LinearScale();
    altScale.setDomain(0, 60);
    altScale.setRange(320, 0);

    const svg = exportToSVG(
      [
        // explicit, resolvable y-axis id
        mockSeriesWithAxis("line", "alt", { x: Float32Array.from([0, 100]), y: Float32Array.from([0, 60]) }, {}),
        // unknown y-axis id, no primary → skipped
        mockSeriesWithAxis("line", "ghost", { x: Float32Array.from([0, 100]), y: Float32Array.from([0, 60]) }, {}),
        // empty data → skipped
        localMockSeries("line", { x: new Float32Array(0), y: new Float32Array(0) }, {}),
        // series with no style props → default width/opacity/color
        localMockSeries("scatter", { x: Float32Array.from([25, 75]), y: Float32Array.from([15, 45]) }, {}),
        localMockSeries("bar", { x: Float32Array.from([20, 60]), y: Float32Array.from([10, 30]) }, {}),
        localMockSeries("candlestick", {
          x: Float32Array.from([50]),
          y: Float32Array.from([0]),
          open: Float32Array.from([20]),
          high: Float32Array.from([30]),
          low: Float32Array.from([15]),
          close: Float32Array.from([25]),
        }, {}),
        // band with no y2 → default zero baseline
        localMockSeries("band", { x: Float32Array.from([0, 50, 100]), y: Float32Array.from([40, 50, 45]) }, {}),
      ],
      { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
      { x: 60, y: 40, width: 400, height: 240 },
      xScale,
      new Map([
        ["alt", altScale],
        ["default", yScale],
      ]),
      minimalTheme,
      520,
      320,
      {}, // no xAxis/yAxis options → tickCount + showLabels defaults
    );

    expect(svg).toContain("<polyline");
    expect(svg).toContain("<circle");
    expect(svg).toContain("<polygon");
    expect(svg).toContain('font-family="sans-serif"');
  });

  it("renders bearish candlesticks and hides tick labels when requested", () => {
    const bear = exportWithSeries([
      localMockSeries(
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
      [localMockSeries("line", { x: Float32Array.from([0, 50]), y: Float32Array.from([1, 2]) }, { color: "#fff" })],
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

  it("exportChartToSVG and exportChartSnapshot delegate to the v2 pipeline", () => {
    const { xScale, yScale } = testScales();
    const series = mockSeries("line");
    const svg = exportChartToSVG({
      series: [series],
      viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
      plotArea: { x: 60, y: 40, width: 400, height: 240 },
      xScale,
      yAxes: new Map([["default", yScale]]),
      theme: testTheme,
      width: 520,
      height: 320,
    });
    expect(svg).toContain("<svg");

    const snapshotSvg = exportChartSnapshot(
      {
        getAllSeries: () => [series],
        viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
        getPlotArea: () => ({ x: 60, y: 40, width: 400, height: 240 }),
        xScale,
        yScales: new Map([["default", yScale]]),
        theme: testTheme,
        container: { getBoundingClientRect: () => ({ width: 520, height: 320 }) } as HTMLElement,
        xAxisOptions: {},
        yAxisOptionsMap: new Map([["default", {}]]),
        primaryYAxisId: "default",
      },
      { includeLegend: false },
    );
    expect(snapshotSvg).toContain("<svg");
  });

  it("maps explicit yAxis options to primaryYAxisId", () => {
    const xScale = new LinearScale();
    xScale.setDomain(0, 100);
    xScale.setRange(60, 460);
    const yScale = new LinearScale();
    yScale.setDomain(0, 60);
    yScale.setRange(280, 40);

    const svg = exportToSVG(
      [localMockSeries("line", { x: Float32Array.from([0, 100]), y: Float32Array.from([10, 50]) }, { color: "#fff" })],
      { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
      { x: 60, y: 40, width: 400, height: 240 },
      xScale,
      new Map([["alt", yScale]]),
      theme,
      520,
      320,
      { primaryYAxisId: "alt", yAxis: { tickCount: 6, showLabels: true } },
    );
    expect(svg).toContain("<polyline");
  });

  it("uses default yAxis map entry when primaryYAxisId is set without yAxis options", () => {
    const xScale = new LinearScale();
    xScale.setDomain(0, 100);
    xScale.setRange(60, 460);
    const yScale = new LinearScale();
    yScale.setDomain(0, 60);
    yScale.setRange(280, 40);

    const svg = exportToSVG(
      [localMockSeries("line", { x: Float32Array.from([0, 100]), y: Float32Array.from([10, 50]) }, { color: "#fff" })],
      { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
      { x: 60, y: 40, width: 400, height: 240 },
      xScale,
      new Map([["alt", yScale]]),
      theme,
      520,
      320,
      { primaryYAxisId: "alt", xAxis: { tickCount: 4 } },
    );
    expect(svg).toContain("<polyline");
  });

  it("exportChartSnapshot works without export options", () => {
    const { xScale, yScale } = testScales();
    const series = mockSeries("line");
    const snapshotSvg = exportChartSnapshot({
      getAllSeries: () => [series],
      viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
      getPlotArea: () => ({ x: 60, y: 40, width: 400, height: 240 }),
      xScale,
      yScales: new Map([["default", yScale]]),
      theme: testTheme,
      container: { getBoundingClientRect: () => ({ width: 520, height: 320 }) } as HTMLElement,
      xAxisOptions: {},
      yAxisOptionsMap: new Map([["default", {}]]),
      primaryYAxisId: "default",
    });
    expect(snapshotSvg).toContain("<svg");
  });
});
