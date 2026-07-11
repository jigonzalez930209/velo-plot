/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { LinearScale } from "../../scales";
import { composeStackSVG } from "./StackSVGComposer";
import { testTheme } from "../chart/exporter/svg/__tests__/testFixtures";
import { assertGoldenText } from "../chart/exporter/svg/__tests__/visualTestUtils";
import type { Series } from "../Series";

function mockPaneChart(id: string, series: Series, height: number) {
  const xScale = new LinearScale();
  xScale.setDomain(0, 100);
  xScale.setRange(50, 350);
  const yScale = new LinearScale();
  yScale.setDomain(0, 60);
  yScale.setRange(height - 30, 20);

  const container = {
    getBoundingClientRect: () => ({
      width: 400,
      height,
      left: 0,
      top: 0,
      right: 400,
      bottom: height,
    }),
    clientWidth: 400,
    clientHeight: height,
  } as HTMLElement;

  return {
    getAllSeries: () => [series],
    viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
    getPlotArea: () => ({ x: 50, y: 20, width: 300, height: height - 40 }),
    xScale,
    yScales: new Map([["default", yScale]]),
    theme: testTheme,
    container,
    xAxisOptions: { tickCount: 4 },
    yAxisOptionsMap: new Map([["default", { tickCount: 4 }]]),
    primaryYAxisId: "default",
    showLegend: false,
    render: () => {},
    getId: () => id,
  };
}

function mockSeries(type: string, color: string): Series {
  return {
    isVisible: () => true,
    getYAxisId: () => undefined,
    getId: () => type,
    getName: () => type,
    getType: () => type,
    getStyle: () => ({ color, width: 2 }),
    getData: () => ({
      x: Float32Array.from([0, 50, 100]),
      y: Float32Array.from([15, 35, 25]),
    }),
    hasErrorData: () => false,
    getMarkers: () => [],
  } as unknown as Series;
}

function layoutContainer(width: number, height: number, panes: Array<{ top: number; h: number }>) {
  const container = document.createElement("div");
  container.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
  });

  const wrappers = panes.map((p) => {
    const w = document.createElement("div");
    w.getBoundingClientRect = () => ({
      left: 0,
      top: p.top,
      width,
      height: p.h,
      right: width,
      bottom: p.top + p.h,
    });
    container.appendChild(w);
    return w;
  });

  return { container, wrappers };
}

describe("stack golden SVG", () => {
  it("3-pane vertical stack matches golden file", () => {
    const paneH = [120, 100, 80];
    const totalH = paneH.reduce((a, b) => a + b, 0);
    let top = 0;
    const panes = paneH.map((h) => {
      const p = { top, h };
      top += h;
      return p;
    });
    const { container, wrappers } = layoutContainer(400, totalH, panes);
    const charts = [
      mockPaneChart("price", mockSeries("candlestick", "#22c55e"), paneH[0]),
      mockPaneChart("volume", mockSeries("bar", "#3b82f6"), paneH[1]),
      mockPaneChart("rsi", mockSeries("line", "#f59e0b"), paneH[2]),
    ];

    const svg = composeStackSVG(container, wrappers, charts as never, [], {
      backgroundColor: "#111",
      includeDividers: true,
    });
    assertGoldenText("stack-vertical-3pane.golden.svg", svg);
    expect(svg).toContain("<g transform=");
  });

  it("2-pane horizontal layout matches golden file", () => {
    const container = document.createElement("div");
    container.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 240,
      right: 800,
      bottom: 240,
    });

    const left = document.createElement("div");
    left.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 400,
      height: 240,
      right: 400,
      bottom: 240,
    });
    const right = document.createElement("div");
    right.getBoundingClientRect = () => ({
      left: 400,
      top: 0,
      width: 400,
      height: 240,
      right: 800,
      bottom: 240,
    });
    container.append(left, right);

    const charts = [
      mockPaneChart("left", mockSeries("line", "#ef4444"), 240),
      mockPaneChart("right", mockSeries("scatter", "#8b5cf6"), 240),
    ];

    const svg = composeStackSVG(container, [left, right], charts as never, [], {
      backgroundColor: "#0b0e14",
      includeDividers: true,
    });
    assertGoldenText("stack-horizontal-2pane.golden.svg", svg);
  });
});
