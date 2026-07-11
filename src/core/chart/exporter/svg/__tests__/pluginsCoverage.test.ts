import { describe, it, expect } from "vitest";
import { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { renderSVG } from "../SVGOrchestrator";
import { exportAnnotations } from "../plugins/annotations";
import { exportBrokenAxisFromConfig, exportBrokenAxisMarkers } from "../plugins/brokenAxis";
import { exportForecastOverlay } from "../plugins/regression";
import { exportLatexText } from "../plugins/latex";
import { exportRoiRegions } from "../plugins/roi";
import { exportWatermark, exportGridHighlight } from "../plugins/watermark";
import { exportCandlestickMarkers } from "../plugins/tradeMarkers";
import { collectPluginSVGData } from "../plugins/register";
import type { SVGExportPluginContext } from "../plugins/types";
import { buildTestContext, sampleAnnotations, seriesFixtures } from "./testFixtures";

function pluginCtx(extra: Partial<SVGExportPluginContext> = {}): SVGExportPluginContext {
  const exportContext = buildTestContext([seriesFixtures().line]);
  return {
    series: exportContext.series,
    viewBounds: exportContext.viewBounds,
    plotArea: exportContext.plotArea,
    xScale: exportContext.xScale,
    yScales: exportContext.yAxes,
    theme: exportContext.theme,
    width: exportContext.width,
    height: exportContext.height,
    builder: undefined,
    exportContext,
    ...extra,
  };
}

describe("SVG plugin exporters", () => {
  it("exports all annotation types", () => {
    const ctx = pluginCtx();
    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    exportAnnotations({ ...ctx, builder }, sampleAnnotations);
    const svg = builder.build("#111");
    expect(svg).toContain("Peak");
    expect(svg).toContain("<line");
    expect(svg).toContain("<rect");
  });

  it("exports broken axis, forecast, latex, roi, watermark, grid highlight", () => {
    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    const ctx = { ...pluginCtx(), builder };

    exportBrokenAxisFromConfig(ctx, {
      default: { breaks: [{ start: 40, end: 60, symbol: "zigzag" }], symbolColor: "#f0f" },
    });
    exportBrokenAxisMarkers(ctx, [{ axis: "y", position: 30, style: "diagonal" }]);
    exportForecastOverlay(
      ctx,
      [
        { x: 50, y: 30 },
        { x: 80, y: 40 },
      ],
      {
        upper: [
          { x: 50, y: 35 },
          { x: 80, y: 45 },
        ],
        lower: [
          { x: 50, y: 25 },
          { x: 80, y: 35 },
        ],
      },
    );
    exportLatexText(ctx, "\\alpha + \\beta", 200, 150, { fontSize: 14, color: "#fff" });
    exportRoiRegions(ctx, [
      {
        tool: "rectangle",
        points: [
          { x: 20, y: 20 },
          { x: 40, y: 40 },
        ],
      },
      {
        tool: "circle",
        points: [
          { x: 60, y: 30 },
          { x: 70, y: 40 },
        ],
      },
      {
        tool: "polygon",
        points: [
          { x: 80, y: 20 },
          { x: 90, y: 35 },
          { x: 75, y: 40 },
        ],
      },
    ]);
    exportWatermark(ctx, "CONFIDENTIAL", { opacity: 0.2, rotation: -20 });
    exportGridHighlight(ctx, [
      { axis: "x", min: 20, max: 40, color: "rgba(59,130,246,0.1)" },
      { axis: "y", min: 15, max: 35, color: "rgba(34,197,94,0.1)" },
    ]);

    const svg = builder.build("#111");
    expect(svg).toContain("foreignObject");
    expect(svg).toContain("CONFIDENTIAL");
    expect(svg).toContain("<circle");
    expect(svg).toContain("<polygon");
  });

  it("exports candlestick trade markers via plugin manager hooks", () => {
    const series = seriesFixtures().candlestick;
    (series as unknown as { getMarkers: () => unknown[] }).getMarkers = () => [
      { x: 30, y: 32, type: "buy", label: "B" },
      { x: 60, y: 24, type: "sell", label: "S" },
    ];
    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    exportCandlestickMarkers({ ...pluginCtx(), builder, series: [series] });
    const svg = builder.build("#111");
    expect(svg.length).toBeGreaterThan(100);
  });

  it("collectPluginSVGData wires annotations and radar", () => {
    const builder = new SVGDocumentBuilder(520, 320, "sans-serif");
    const exportContext = buildTestContext([seriesFixtures().line]);
    const pluginManager = {
      get: (name: string) => {
        if (name === "velo-plot-annotations") {
          return { api: { getManager: () => ({ getAll: () => sampleAnnotations }) } };
        }
        if (name === "velo-plot-radar") {
          return {
            api: {
              getSVGExportData: () => ({
                categories: ["A", "B", "C"],
                maxValue: 100,
                gridLevels: 5,
                showLabels: true,
                series: [
                  {
                    id: "test",
                    name: "Test",
                    points: [
                      { category: "A", value: 80 },
                      { category: "B", value: 60 },
                      { category: "C", value: 90 },
                    ],
                    style: { color: "#3b82f6", fillColor: "rgba(59,130,246,0.2)", width: 2 },
                  },
                ],
              }),
            },
          };
        }
        return undefined;
      },
      notifyExportSVG: () => {},
    };

    collectPluginSVGData(pluginManager, {
      ...pluginCtx(),
      builder,
      exportContext,
    });

    const svg = builder.build("#111");
    expect(svg).toContain("Peak");
    expect(svg).toContain("<polygon");
  });

  it("renders full chart with plugin overlays enabled", () => {
    const svg = renderSVG(
      buildTestContext([seriesFixtures().line, seriesFixtures().errors], {
        options: { includeOverlays: true, watermarkText: "TEST" },
      }),
    );
    expect(svg).toContain("TEST");
  });
});
