import { describe, it, expect, vi, beforeEach } from "vitest";
import { OverlayRenderer } from "./OverlayRenderer";
import { LinearScale } from "../scales";
import { DARK_THEME, LIGHT_THEME } from "../theme";
import type { ChartTheme } from "../theme";
import type { Series } from "./Series";

const plotArea = { x: 50, y: 30, width: 400, height: 260 };

function createMockCtx() {
  const canvas = {
    width: 800,
    height: 600,
  } as HTMLCanvasElement;

  return {
    canvas,
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    globalAlpha: 1,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    setLineDash: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
  } as unknown as CanvasRenderingContext2D;
}

function makeScales() {
  const xScale = new LinearScale();
  xScale.setDomain(0, 100);
  xScale.setRange(50, 450);
  const yScale = new LinearScale();
  yScale.setDomain(0, 100);
  yScale.setRange(290, 30);
  return { xScale, yScale };
}

function mockSeries(overrides: Partial<{
  id: string;
  type: string;
  style: Record<string, unknown>;
  hasError: boolean;
  symbol: string;
}> = {}): Series {
  const {
    id = "series-a",
    type = "line",
    style = { color: "#ff0055", width: 2, opacity: 1, symbol: "circle" },
    hasError = false,
    symbol,
  } = overrides;

  return {
    getId: () => id,
    getType: () => type,
    getStyle: () => (symbol ? { ...style, symbol } : style),
    hasErrorData: () => hasError,
    getData: () => ({
      x: Float32Array.from([10, 50, 90]),
      y: Float32Array.from([20, 60, 40]),
    }),
    getYError: (_i: number) => (hasError ? [2, 3] : null),
    getXError: (i: number) => (hasError && i === 1 ? [1, 1] : null),
  } as unknown as Series;
}

describe("OverlayRenderer", () => {
  let ctx: CanvasRenderingContext2D;
  let renderer: OverlayRenderer;
  let theme: ChartTheme;

  beforeEach(() => {
    ctx = createMockCtx();
    theme = structuredClone(DARK_THEME);
    renderer = new OverlayRenderer(ctx, theme);
  });

  it("clear, setTheme, and setLatexAPI", () => {
    renderer.clear();
    expect(ctx.clearRect).toHaveBeenCalled();

    renderer.setTheme(LIGHT_THEME);
    renderer.setLatexAPI({
      measure: vi.fn(() => ({ width: 40, height: 14, baseline: 10 })),
      render: vi.fn(),
    });
  });

  it("drawGrid with major and minor lines", () => {
    const { xScale, yScale } = makeScales();
    theme.grid.showMinor = true;
    theme.grid.minorDivisions = 4;
    renderer.setTheme(theme);
    renderer.drawGrid(plotArea, xScale, yScale, { tickCount: 5 }, { tickCount: 4 });
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("drawGrid returns early when grid is hidden", () => {
    theme.grid.visible = false;
    renderer.setTheme(theme);
    const { xScale, yScale } = makeScales();
    renderer.drawGrid(plotArea, xScale, yScale);
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it("drawPolarGrid in degrees and radians", () => {
    const { xScale, yScale } = makeScales();
    renderer.drawPolarGrid(plotArea, xScale, yScale, 4, 8, "degrees");
    renderer.drawPolarGrid(plotArea, xScale, yScale, 3, 6, "radians");
    expect(ctx.arc).toHaveBeenCalled();
  });

  it("drawXAxis with labels, ticks, and LaTeX title", () => {
    const { xScale } = makeScales();
    renderer.setLatexAPI({
      measure: vi.fn(() => ({ width: 30, height: 12, baseline: 9 })),
      render: vi.fn(),
    });
    renderer.drawXAxis(
      plotArea,
      xScale,
      { label: "E_{cell}", tickCount: 4, type: "time" },
      { titleGap: 40 },
    );
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("drawYAxis on left and right with title", () => {
    const { yScale } = makeScales();
    renderer.drawYAxis(plotArea, yScale, { label: "Current", tickCount: 4 }, "left");
    renderer.drawYAxis(plotArea, yScale, { label: "Alt", tickCount: 3 }, "right", 10);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("drawPlotBorder and chart titles", () => {
    renderer.drawPlotBorder(plotArea);
    expect(ctx.strokeRect).toHaveBeenCalled();

    renderer.drawChartTitle(plotArea, { visible: false, text: "" });
    renderer.drawChartTitle(plotArea, {
      visible: true,
      text: "Cyclic Voltammetry",
      align: "left",
      position: "top",
    });
    renderer.drawChartTitle(plotArea, {
      visible: true,
      text: "Bottom Title",
      align: "right",
      position: "bottom",
      padding: { top: 4, bottom: 6 },
    });
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("drawLegend for all positions and symbol types", () => {
    const positions = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
    for (const position of positions) {
      theme.legend.position = position;
      renderer.setTheme(theme);
      renderer.drawLegend(plotArea, [
        mockSeries({ id: "line", type: "line" }),
        mockSeries({ id: "scatter", type: "scatter", symbol: "diamond" }),
        mockSeries({ id: "mixed", type: "line-scatter", symbol: "square" }),
        mockSeries({ id: "E=mc^2", type: "line" }),
      ]);
    }
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("drawLegend returns early for empty series", () => {
    const fillCalls = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length;
    renderer.drawLegend(plotArea, []);
    expect((ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fillCalls);
  });

  it("drawCursor crosshair, tooltips, and outside plot guard", () => {
    renderer.drawCursor(plotArea, { enabled: false, x: 100, y: 100, crosshair: false }, "solid");
    renderer.drawCursor(plotArea, { enabled: true, x: 10, y: 10, crosshair: true }, "solid");
    renderer.drawCursor(
      plotArea,
      {
        enabled: true,
        x: 200,
        y: 120,
        crosshair: false,
        tooltipText: "x=1\ny=2",
        valueDisplayMode: "floating",
      },
      "dotted",
    );
    renderer.drawCursor(
      plotArea,
      {
        enabled: true,
        x: 220,
        y: 140,
        crosshair: true,
        tooltipText: "corner",
        valueDisplayMode: "corner",
        cornerPosition: "bottom-right",
      },
      "dashed",
    );
    renderer.drawCursor(
      plotArea,
      {
        enabled: true,
        x: 999,
        y: 999,
        crosshair: true,
        tooltipText: "outside",
        valueDisplayMode: "disabled",
      },
    );
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("drawSelectionRect uses dark and light fills", () => {
    renderer.drawSelectionRect({ x: 60, y: 40, width: 80, height: 50 });
    renderer.setTheme(LIGHT_THEME);
    renderer.drawSelectionRect({ x: 70, y: 50, width: 60, height: 40 });
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("drawErrorBars handles visibility, directions, and caps", () => {
    const { xScale, yScale } = makeScales();
    renderer.drawErrorBars(plotArea, mockSeries({ hasError: false }), xScale, yScale);

    renderer.drawErrorBars(plotArea, mockSeries({ hasError: true }), xScale, yScale);

    renderer.drawErrorBars(
      plotArea,
      mockSeries({
        hasError: true,
        style: {
          color: "#00f",
          errorBars: {
            visible: false,
            direction: "positive",
            showCaps: false,
            capWidth: 4,
          },
        },
      }),
      xScale,
      yScale,
    );

    renderer.drawErrorBars(
      plotArea,
      mockSeries({
        hasError: true,
        style: {
          color: "#0f0",
          errorBars: { direction: "negative", showCaps: true },
        },
      }),
      xScale,
      yScale,
    );
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("renders LaTeX labels when API is configured", () => {
    const latex = {
      measure: vi.fn(() => ({ width: 24, height: 12, baseline: 9 })),
      render: vi.fn(),
    };
    renderer.setLatexAPI(latex);
    const { xScale } = makeScales();
    renderer.drawXAxis(plotArea, xScale, {
      label: "\\alpha",
      tickCount: 3,
      showLabels: true,
    });
    expect(latex.render).toHaveBeenCalled();
  });

  it("drawLegend renders all symbol shapes", () => {
    const symbols = [
      "circle",
      "square",
      "diamond",
      "triangle",
      "triangleDown",
      "cross",
      "x",
      "star",
    ] as const;
    for (const symbol of symbols) {
      renderer.drawLegend(plotArea, [
        mockSeries({ id: symbol, type: "scatter", symbol }),
      ]);
    }
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("drawPolarGrid returns early when grid is hidden", () => {
    theme.grid.visible = false;
    renderer.setTheme(theme);
    const { xScale, yScale } = makeScales();
    renderer.drawPolarGrid(plotArea, xScale, yScale);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("drawXAxis respects showLine, showTicks, and showLabels flags", () => {
    const { xScale } = makeScales();
    renderer.drawXAxis(plotArea, xScale, {
      showLine: false,
      showTicks: false,
      showLabels: false,
    });
    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it("drawYAxis respects visibility flags on the right side", () => {
    const { yScale } = makeScales();
    renderer.drawYAxis(
      plotArea,
      yScale,
      { showLine: false, showTicks: false, showLabels: false },
      "right",
      20,
    );
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it("drawChartTitle supports center alignment and numeric padding", () => {
    renderer.drawChartTitle(plotArea, {
      visible: true,
      text: "Centered",
      align: "center",
      position: "top",
      padding: 12,
    });
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("drawCursor uses solid style and LaTeX floating tooltip repositioning", () => {
    renderer.setLatexAPI({
      measure: vi.fn(() => ({ width: 50, height: 16, baseline: 12 })),
      render: vi.fn(),
    });
    renderer.drawCursor(
      plotArea,
      {
        enabled: true,
        x: plotArea.x + plotArea.width - 5,
        y: plotArea.y + 5,
        crosshair: true,
        tooltipText: "E=mc^2\nline2",
        valueDisplayMode: "floating",
      },
      "solid",
    );
    renderer.drawCursor(
      plotArea,
      {
        enabled: true,
        x: plotArea.x + 20,
        y: plotArea.y + plotArea.height - 5,
        crosshair: false,
        tooltipText: "corner",
        valueDisplayMode: "corner",
        cornerPosition: "top-left",
      },
    );
    renderer.drawCursor(
      plotArea,
      {
        enabled: true,
        x: plotArea.x + 20,
        y: plotArea.y + 20,
        crosshair: true,
        tooltipText: "br",
        valueDisplayMode: "corner",
        cornerPosition: "bottom-right",
      },
    );
    renderer.drawCursor(
      plotArea,
      {
        enabled: true,
        x: plotArea.x + 20,
        y: plotArea.y + 20,
        crosshair: true,
        tooltipText: "tr",
        valueDisplayMode: "corner",
        cornerPosition: "top-right",
      },
    );
    renderer.drawCursor(
      plotArea,
      {
        enabled: true,
        x: plotArea.x + 20,
        y: plotArea.y + 20,
        crosshair: true,
        tooltipText: "bl",
        valueDisplayMode: "corner",
        cornerPosition: "bottom-left",
      },
    );
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("drawLegend handles LaTeX labels and scatter type fallbacks", () => {
    renderer.setLatexAPI({
      measure: vi.fn(() => ({ width: 40, height: 12, baseline: 9 })),
      render: vi.fn(),
    });
    renderer.drawLegend(plotArea, [
      mockSeries({ id: "\\alpha", type: "line" }),
      mockSeries({ id: "scatter1", type: "1" as string, symbol: "triangle" }),
      mockSeries({ id: "mixed2", type: "2" as string, symbol: "square" }),
    ]);
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("drawLatexOrText uses alignments and baselines for LaTeX", () => {
    const latex = {
      measure: vi.fn(() => ({ width: 20, height: 10, baseline: 8 })),
      render: vi.fn(),
    };
    renderer.setLatexAPI(latex);
    const { xScale } = makeScales();
    renderer.drawXAxis(plotArea, xScale, { label: "x^{2}", tickCount: 2 });
    renderer.drawYAxis(
      plotArea,
      makeScales().yScale,
      { label: "y_{i}", tickCount: 2 },
      "left",
    );
    expect(latex.render).toHaveBeenCalled();
  });

  it("drawSelectionRect uses midnight theme branch", () => {
    const midnight = structuredClone(DARK_THEME);
    midnight.name = "midnight";
    renderer.setTheme(midnight);
    renderer.drawSelectionRect({ x: 60, y: 40, width: 80, height: 50 });
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("drawErrorBars skips points outside plot area", () => {
    const { xScale, yScale } = makeScales();
    const farSeries = {
      getId: () => "far",
      getType: () => "scatter",
      getStyle: () => ({ color: "#f00" }),
      hasErrorData: () => true,
      getData: () => ({
        x: Float32Array.from([-999]),
        y: Float32Array.from([-999]),
      }),
      getYError: () => [1, 1],
      getXError: () => null,
    } as unknown as Series;
    renderer.drawErrorBars(plotArea, farSeries, xScale, yScale);
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it("drawCornerTooltip renders LaTeX lines in all corners", () => {
    const latex = {
      measure: vi.fn(() => ({ width: 36, height: 14, baseline: 10 })),
      render: vi.fn(),
    };
    renderer.setLatexAPI(latex);
    const corners = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
    for (const cornerPosition of corners) {
      renderer.drawCursor(
        plotArea,
        {
          enabled: true,
          x: plotArea.x + 100,
          y: plotArea.y + 80,
          crosshair: false,
          tooltipText: "\\beta\nvalue",
          valueDisplayMode: "corner",
          cornerPosition,
        },
      );
    }
    expect(latex.render).toHaveBeenCalled();
  });

  it("drawCandlestickMarkers renders shapes and text", () => {
    const { xScale, yScale } = makeScales();
    const series = {
      getType: () => "candlestick",
      getMarkers: () => [
        { time: 50, shape: "arrowUp" as const, position: "aboveBar" as const, text: "Buy" },
        { time: 90, shape: "circle" as const, position: "belowBar" as const, color: "#ef4444" },
        { time: 10, shape: "arrowDown" as const, position: "inBar" as const },
      ],
      getData: () => ({
        x: Float32Array.from([10, 50, 90]),
        high: Float32Array.from([22, 62, 42]),
        low: Float32Array.from([18, 58, 38]),
        close: Float32Array.from([20, 60, 40]),
      }),
    } as unknown as Series;

    renderer.drawCandlestickMarkers(plotArea, series, xScale, yScale);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith("Buy", expect.any(Number), expect.any(Number));
  });

  it("drawCandlestickMarkers skips non-candlestick series", () => {
    const { xScale, yScale } = makeScales();
    const lineSeries = mockSeries({ type: "line" });
    renderer.drawCandlestickMarkers(plotArea, lineSeries, xScale, yScale);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("drawPriceAlertLines strokes horizontal alert levels", () => {
    const { yScale } = makeScales();
    renderer.drawPriceAlertLines(
      plotArea,
      [
        { price: 25, direction: "below" },
        { price: 75, direction: "above" },
        { price: 50, direction: "cross" },
      ],
      yScale,
    );
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.setLineDash).toHaveBeenCalled();
  });
});
