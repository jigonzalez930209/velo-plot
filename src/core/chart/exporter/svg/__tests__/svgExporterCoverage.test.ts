import { describe, it, expect, vi } from "vitest";
import { LinearScale } from "../../../../../scales";
import { renderSVG } from "../SVGOrchestrator";
import { buildSVGExportContext, captureLayoutSnapshot } from "../SVGExportContext";
import { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { exportAllOverlays } from "../overlay";
import { exportGrid } from "../overlay/grid";
import { exportAxes } from "../overlay/axes";
import { exportTitle } from "../overlay/title";
import { exportPlotBorder } from "../overlay/border";
import { exportLegend } from "../overlay/legend";
import { exportErrorBars } from "../overlay/errorBars";
import { exportCursor, exportSelection, exportPriceAlerts } from "../overlay/index";
import { strokeAttrs, gridMajorStyle, gridMinorStyle } from "../SVGThemeAdapter";
import { getRegisteredSeriesTypes } from "../series/registry";
import { filterSeriesAtTimestamp } from "../seriesAtTimestamp";
import { Series } from "../../../../Series";
import { buildTestContext, mockSeries, seriesFixtures, testTheme } from "./testFixtures";
import { reorderForHoveredSeries } from "../../../ChartRenderer";

describe("SVG exporter coverage", () => {
  const fixtures = seriesFixtures();

  it("exports every registered series type", () => {
    const types = getRegisteredSeriesTypes().filter((t) => t !== "radar");
    const series = types.map((t) => fixtures[t] ?? mockSeries(t));
    const svg = renderSVG(buildTestContext(series));
    expect(svg).toContain("<svg");
    for (const _type of types) {
      expect(svg.length).toBeGreaterThan(300);
    }
  });

  it("exports overlays: cursor, selection, alerts, legend", () => {
    const ctx = buildTestContext([fixtures.line]);
    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    exportAllOverlays(ctx, builder);
    const partial = builder.build("#111");
    expect(partial).toContain("<line");
    expect(partial).toContain("SVG Test");
  });

  it("exports individual overlay modules", () => {
    const ctx = buildTestContext([fixtures.line]);
    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    exportGrid(ctx, builder);
    exportAxes(ctx, builder);
    exportTitle(ctx, builder);
    exportPlotBorder(ctx, builder);
    exportLegend(ctx, builder);
    exportErrorBars(ctx, builder);
    exportCursor(ctx, builder);
    exportSelection(ctx, builder);
    exportPriceAlerts(ctx, builder);
    const out = builder.build("#111");
    expect(out).toContain("<text");
    expect(out).toContain("<rect");
  });

  it("skips vector legend when includeLegend is false (live SVG uses DOM legend)", () => {
    const ctx = buildTestContext([fixtures.line], {
      options: { includeLegend: false, includeOverlays: true },
    });
    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    exportLegend(ctx, builder);
    const out = builder.build("#111");
    expect(out).not.toContain('class="legend"');
    expect(out).not.toMatch(/<g[^>]*id="legend"/);
    // legend layer uses group name "legend" in builder - check no legend rect from exportLegend
    const legendLayer = out.match(/<g[^>]*data-layer="legend"[^>]*>[\s\S]*?<\/g>/);
    expect(legendLayer ?? []).toHaveLength(0);
  });

  it("reorders series for legend hover in SVG snapshot", () => {
    const area1 = mockSeries("area", { id: "area1", style: { color: "#00f2ff" } });
    const area2 = mockSeries("area", { id: "area2", style: { color: "#ff6b6b" } });
    const ordered = reorderForHoveredSeries([area1, area2], "area1", (s) => s.getId());
    expect(ordered.map((s) => s.getId())).toEqual(["area2", "area1"]);
  });

  it("captureLayoutSnapshot respects getHoveredSeriesId", () => {
    const area1 = mockSeries("area", { id: "area1" });
    const area2 = mockSeries("area", { id: "area2" });
    const ctx = captureLayoutSnapshot({
      getAllSeries: () => [area1, area2],
      getHoveredSeriesId: () => "area2",
      viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
      getPlotArea: () => ({ x: 60, y: 40, width: 400, height: 240 }),
      xScale: (() => {
        const xs = new LinearScale();
        xs.setDomain(0, 100);
        xs.setRange(60, 460);
        return xs;
      })(),
      yScales: (() => {
        const ys = new LinearScale();
        ys.setDomain(0, 60);
        ys.setRange(280, 40);
        return new Map([["default", ys]]);
      })(),
      theme: testTheme,
      container: { getBoundingClientRect: () => ({ width: 520, height: 320 }) } as HTMLElement,
      xAxisOptions: {},
      yAxisOptionsMap: new Map([["default", {}]]),
      primaryYAxisId: "default",
    });
    expect(ctx.series.map((s) => s.getId())).toEqual(["area1", "area2"]);
  });

  it("covers theme adapter helpers", () => {
    expect(strokeAttrs(gridMajorStyle(testTheme))).toContain("stroke=");
    expect(strokeAttrs(gridMinorStyle(testTheme))).toContain("stroke=");
  });

  it("covers SVGDocumentBuilder defs and layers", () => {
    const builder = new SVGDocumentBuilder(200, 100, "Inter");
    builder.resetGradientCounter();
    const grad = builder.registerLinearGradient(0, 0, 1, 1, [
      { offset: "0%", color: "#000" },
      { offset: "100%", color: "#fff", opacity: 0.5 },
    ]);
    builder.registerClipPath("clip-test", '<rect x="0" y="0" width="10" height="10"/>');
    builder.push("series", `<rect fill="url(#${grad})"/>`);
    const svg = builder.build("#000", "Chart");
    expect(svg).toContain("clip-test");
    expect(svg).toContain('aria-label="Chart"');
  });

  it("handles multi Y-axis layouts", () => {
    const { xScale, yScale } = (() => {
      const xs = new LinearScale();
      xs.setDomain(0, 100);
      xs.setRange(60, 460);
      const ys = new LinearScale();
      ys.setDomain(0, 60);
      ys.setRange(280, 40);
      const y2 = new LinearScale();
      y2.setDomain(0, 100);
      y2.setRange(280, 40);
      return { xScale: xs, yScale: ys, y2 };
    })();

    const svg = renderSVG(
      buildSVGExportContext({
        series: [mockSeries("line", { yAxisId: "right", style: { color: "#0af" } })],
        viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 60 },
        plotArea: { x: 60, y: 40, width: 400, height: 240 },
        xScale,
        yAxes: new Map([
          ["default", yScale],
          ["right", yScale],
        ]),
        theme: testTheme,
        width: 520,
        height: 320,
        yAxisOptionsMap: new Map([
          ["default", { position: "left", tickCount: 4 }],
          ["right", { position: "right", tickCount: 4 }],
        ]),
        primaryYAxisId: "default",
      }),
    );
    expect(svg).toContain("<polyline");
  });

  it("captureLayoutSnapshot applies at filter and options", () => {
    const series = new Series({
      id: "live",
      type: "line",
      data: {
        x: Float32Array.from([1, 2, 3, 4, 5]),
        y: Float32Array.from([10, 20, 30, 40, 50]),
      },
    });
    const xScale = new LinearScale();
    xScale.setDomain(0, 10);
    xScale.setRange(0, 500);
    const yScale = new LinearScale();
    yScale.setDomain(0, 100);
    yScale.setRange(300, 0);

    const container = {
      getBoundingClientRect: () => ({
        width: 520,
        height: 320,
        left: 0,
        top: 0,
        right: 520,
        bottom: 320,
      }),
      clientWidth: 520,
      clientHeight: 320,
    } as HTMLElement;

    const ctx = captureLayoutSnapshot(
      {
        getAllSeries: () => [series],
        viewBounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 100 },
        getPlotArea: () => ({ x: 50, y: 30, width: 420, height: 260 }),
        xScale,
        yScales: new Map([["default", yScale]]),
        theme: testTheme,
        container,
        xAxisOptions: { tickCount: 4 },
        yAxisOptionsMap: new Map([["default", { tickCount: 4 }]]),
        primaryYAxisId: "default",
        showLegend: true,
      },
      { at: 3, watermarkText: "WM", includeOverlays: true },
    );

    expect(ctx.series[0].getData().x.length).toBe(3);
    expect(ctx.options.watermarkText).toBe("WM");
  });

  it("captureLayoutSnapshot tolerates getAlerts when trading is not loaded", () => {
    const xScale = new LinearScale();
    xScale.setDomain(0, 10);
    xScale.setRange(0, 500);
    const yScale = new LinearScale();
    yScale.setDomain(0, 100);
    yScale.setRange(300, 0);
    const container = {
      getBoundingClientRect: () => ({
        width: 520,
        height: 320,
        left: 0,
        top: 0,
        right: 520,
        bottom: 320,
      }),
      clientWidth: 520,
      clientHeight: 320,
    } as HTMLElement;

    const ctx = captureLayoutSnapshot({
      getAllSeries: () => [fixtures.line],
      viewBounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 100 },
      getPlotArea: () => ({ x: 50, y: 30, width: 420, height: 260 }),
      xScale,
      yScales: new Map([["default", yScale]]),
      theme: testTheme,
      container,
      xAxisOptions: { tickCount: 4 },
      yAxisOptionsMap: new Map([["default", { tickCount: 4 }]]),
      primaryYAxisId: "default",
      getAlerts: () => {
        throw new Error("[VeloPlot] getAlerts() requires the trading bundle.");
      },
    });

    expect(ctx.alerts).toEqual([]);
  });

  it("filterSeriesAtTimestamp preserves OHLC fields", () => {
    const s = new Series({
      id: "ohlc",
      type: "candlestick",
      data: {
        x: Float32Array.from([1, 2, 3]),
        y: Float32Array.from([0, 0, 0]),
        open: Float32Array.from([10, 11, 12]),
        high: Float32Array.from([12, 13, 14]),
        low: Float32Array.from([9, 10, 11]),
        close: Float32Array.from([11, 12, 13]),
      },
    });
    const out = filterSeriesAtTimestamp([s], 2);
    expect(out[0].getData().close?.length).toBe(2);
  });

  it("warns on large heatmap cell budget path", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const big = mockSeries("heatmap", {
      heatmapData: {
        xValues: Float32Array.from({ length: 120 }, (_, i) => i),
        yValues: Float32Array.from({ length: 90 }, (_, i) => i),
        zValues: Float32Array.from({ length: 120 * 90 }, (_, i) => i),
      },
    });
    renderSVG(buildTestContext([big]));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
