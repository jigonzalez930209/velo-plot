import { LinearScale } from "../../../../../scales";
import type { Series } from "../../../../Series";
import type { ChartTheme } from "../../../../../theme";
import type { Annotation } from "../../../../annotations/types";
import { buildSVGExportContext, type SVGExportInput } from "../SVGExportContext";

export const testTheme = {
  backgroundColor: "#111",
  grid: {
    visible: true,
    majorColor: "#333",
    majorWidth: 1,
    minorColor: "#222",
    minorWidth: 1,
    showMinor: true,
    minorDivisions: 4,
    majorDash: [],
    minorDash: [2, 2],
  },
  xAxis: {
    lineColor: "#ccc",
    lineWidth: 1,
    labelColor: "#eee",
    labelSize: 11,
    fontFamily: "sans-serif",
    tickLength: 4,
    tickColor: "#ccc",
    titleColor: "#fff",
    titleSize: 12,
  },
  yAxis: {
    lineColor: "#ccc",
    lineWidth: 1,
    labelColor: "#eee",
    labelSize: 11,
    fontFamily: "sans-serif",
    tickLength: 4,
    tickColor: "#ccc",
    titleColor: "#fff",
    titleSize: 12,
  },
  plotBorderColor: "#444",
  legend: {
    visible: true,
    position: "top-right",
    backgroundColor: "#222",
    borderColor: "#333",
    borderRadius: 4,
    textColor: "#eee",
    fontSize: 11,
    fontFamily: "sans-serif",
    padding: 8,
    itemGap: 4,
    swatchSize: 12,
  },
  cursor: { lineColor: "#fff" },
} as unknown as ChartTheme;

export function testScales() {
  const xScale = new LinearScale();
  xScale.setDomain(0, 100);
  xScale.setRange(60, 460);
  const yScale = new LinearScale();
  yScale.setDomain(0, 60);
  yScale.setRange(280, 40);
  return { xScale, yScale };
}

export function mockSeries(
  type: string,
  overrides: Partial<{
    id: string;
    data: Record<string, Float32Array | Float32Array[]>;
    style: Record<string, unknown>;
    visible: boolean;
    yAxisId: string;
    heatmapData: { xValues: Float32Array; yValues: Float32Array; zValues: Float32Array };
    polarData: { r: Float32Array; theta: Float32Array };
    gaugeData: { value: number; min: number; max: number };
    sankeyData: { nodes: string[]; links: Array<{ source: string; target: string; value: number }> };
    indicatorOptions: Record<string, unknown>;
    hasError: boolean;
    markers: unknown[];
  }> = {},
): Series {
  const id = overrides.id ?? `mock-${type}`;
  const baseData = overrides.data ?? {
    x: Float32Array.from([0, 25, 50, 75, 100]),
    y: Float32Array.from([10, 30, 45, 25, 20]),
  };

  return {
    isVisible: () => overrides.visible ?? true,
    getYAxisId: () => overrides.yAxisId,
    getId: () => id,
    getName: () => type,
    getData: () => baseData,
    getStyle: () => overrides.style ?? { color: "#ff0055", width: 2, opacity: 1, pointSize: 6 },
    getType: () => type,
    hasErrorData: () => overrides.hasError ?? false,
    getYError: (i: number) => {
      const err = baseData.yError?.[i];
      return err != null ? [err, err] as [number, number] : undefined;
    },
    getXError: () => undefined,
    getMarkers: () => overrides.markers ?? [],
    getHeatmapData: () => overrides.heatmapData,
    getHeatmapStyle: () => overrides.style,
    getPolarData: () => overrides.polarData,
    getGaugeData: () => overrides.gaugeData,
    getGaugeStyle: () => overrides.style,
    getSankeyData: () => overrides.sankeyData,
    getSankeyStyle: () => overrides.style,
    indicatorOptions: overrides.indicatorOptions,
  } as unknown as Series;
}

export function seriesFixtures(): Record<string, Series> {
  const xy = {
    x: Float32Array.from([10, 30, 50, 70, 90]),
    y: Float32Array.from([12, 28, 40, 35, 18]),
  };

  return {
    line: mockSeries("line", { data: xy }),
    scatter: mockSeries("scatter", { data: xy, style: { color: "#0af", pointSize: 8, symbol: "diamond" } }),
    "line+scatter": mockSeries("line+scatter", { data: xy, style: { color: "#0af", pointSize: 6, symbol: "circle" } }),
    step: mockSeries("step", { data: xy, style: { color: "#0f0", stepMode: "after" } }),
    "step+scatter": mockSeries("step+scatter", { data: xy, style: { stepMode: "center", pointSize: 5 } }),
    bar: mockSeries("bar", { data: xy, style: { color: "#fa0", barWidth: 8 } }),
    band: mockSeries("band", {
      data: { ...xy, y2: Float32Array.from([8, 18, 30, 28, 12]) },
      style: { color: "#aaf", opacity: 0.4 },
    }),
    area: mockSeries("area", {
      data: { ...xy, y2: Float32Array.from([0, 0, 0, 0, 0]) },
      style: { color: "#8cf", opacity: 0.35 },
    }),
    candlestick: mockSeries("candlestick", {
      data: {
        x: Float32Array.from([30, 60, 90]),
        y: Float32Array.from([0, 0, 0]),
        open: Float32Array.from([20, 25, 30]),
        high: Float32Array.from([32, 35, 38]),
        low: Float32Array.from([18, 22, 26]),
        close: Float32Array.from([28, 24, 34]),
      },
      style: { barWidth: 10 },
    }),
    "heikin-ashi": mockSeries("heikin-ashi", {
      data: {
        x: Float32Array.from([30, 60]),
        y: Float32Array.from([0, 0]),
        open: Float32Array.from([22, 26]),
        high: Float32Array.from([30, 32]),
        low: Float32Array.from([20, 24]),
        close: Float32Array.from([28, 29]),
      },
    }),
    heatmap: mockSeries("heatmap", {
      heatmapData: {
        xValues: Float32Array.from([0, 1, 2]),
        yValues: Float32Array.from([0, 1]),
        zValues: Float32Array.from([1, 2, 3, 4, 5, 6]),
      },
      style: { colormap: "viridis" },
    }),
    polar: mockSeries("polar", {
      polarData: {
        r: Float32Array.from([1, 2, 3, 2, 1]),
        theta: Float32Array.from([0, 1.2, 2.4, 3.6, 4.8]),
      },
    }),
    gauge: mockSeries("gauge", {
      gaugeData: { value: 65, min: 0, max: 100 },
      style: { color: "#3b82f6", trackColor: "#333" },
    }),
    sankey: mockSeries("sankey", {
      sankeyData: {
        nodes: ["A", "B", "C"],
        links: [
          { source: "A", target: "B", value: 10 },
          { source: "B", target: "C", value: 8 },
        ],
      },
      style: { nodeColor: "#64748b", linkColor: "#94a3b8", linkOpacity: 0.5 },
    }),
    ternary: mockSeries("ternary", {
      data: {
        x: Float32Array.from([0.2, 0.5, 0.8]),
        y: Float32Array.from([0.3, 0.4, 0.1]),
        y2: Float32Array.from([0.5, 0.1, 0.1]),
      },
    }),
    waterfall: mockSeries("waterfall", {
      data: {
        x: Float32Array.from([1, 2, 3, 4]),
        y: Float32Array.from([10, -5, 8, 0]),
      },
      style: {
        waterfallTypes: ["positive", "negative", "positive", "subtotal"],
        positiveColor: "#22c55e",
        negativeColor: "#ef4444",
        subtotalColor: "#3b82f6",
      },
    }),
    boxplot: mockSeries("boxplot", {
      data: {
        x: Float32Array.from([25, 75]),
        y: Float32Array.from([20, 30]),
        y2: Float32Array.from([35, 45]),
        median: Float32Array.from([28, 38]),
        q1: Float32Array.from([22, 32]),
        q3: Float32Array.from([34, 44]),
        low: Float32Array.from([18, 28]),
        high: Float32Array.from([40, 50]),
      },
    }),
    indicator: mockSeries("indicator", {
      indicatorOptions: {
        id: "macd",
        type: "indicator",
        data: {
          x: Float32Array.from([0, 25, 50, 75, 100]),
          lines: [
            { id: "macd", y: Float32Array.from([-2, 1, 3, 0, -1]), color: "#3b82f6", width: 1.5 },
            { id: "signal", y: Float32Array.from([-1, 0, 2, 1, 0]), color: "#f59e0b", width: 1 },
          ],
          histogram: {
            y: Float32Array.from([-1, 2, -3, 1, 0]),
            positiveColor: "#22c55e",
            negativeColor: "#ef4444",
          },
        },
      },
    }),
    errors: mockSeries("line", {
      id: "errors",
      hasError: true,
      data: {
        x: Float32Array.from([20, 50, 80]),
        y: Float32Array.from([20, 35, 25]),
        yError: Float32Array.from([3, 4, 2]),
      },
    }),
  };
}

export function buildTestContext(series: Series[], extra: Partial<SVGExportInput> = {}) {
  const { xScale, yScale } = testScales();
  return buildSVGExportContext({
    series,
    viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
    plotArea: { x: 60, y: 40, width: 400, height: 240 },
    xScale,
    yAxes: new Map([["default", yScale]]),
    theme: testTheme,
    width: 520,
    height: 320,
    xAxisOptions: { tickCount: 5, label: "X", showLabels: true },
    yAxisOptionsMap: new Map([["default", { tickCount: 5, label: "Y", position: "left" }]]),
    primaryYAxisId: "default",
    titleOptions: { visible: true, text: "SVG Test" },
    showLegend: true,
    cursor: { x: 200, y: 150 },
    selection: { x: 100, y: 80, width: 120, height: 60 },
    alerts: [{ price: 45, direction: "above" }],
    options: { includeCursor: true, includeSelection: true, watermarkText: "VELO" },
    ...extra,
  });
}

export const sampleAnnotations: Annotation[] = [
  { id: "h1", type: "horizontal-line", y: 30, color: "#f59e0b", label: "Target" },
  { id: "v1", type: "vertical-line", x: 50, color: "#38bdf8" },
  {
    id: "r1",
    type: "rectangle",
    xMin: 20,
    xMax: 40,
    yMin: 15,
    yMax: 35,
    fillColor: "rgba(59,130,246,0.15)",
    strokeColor: "#3b82f6",
  },
  { id: "b1", type: "band", yMin: 10, yMax: 20, fillColor: "rgba(34,197,94,0.12)" },
  { id: "t1", type: "text", x: 70, y: 50, text: "Peak", color: "#fff", fontSize: 12 },
  { id: "a1", type: "arrow", x1: 30, y1: 40, x2: 60, y2: 25, color: "#ef4444" },
];
