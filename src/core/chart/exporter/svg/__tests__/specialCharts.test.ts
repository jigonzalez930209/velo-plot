import { describe, expect, it } from "vitest";
import { LinearScale } from "../../../../../scales";
import { calculateBarWidth } from "../../../../../renderer/BarRenderer";
import { exportBarSeries } from "../series/bar";
import { exportPolarSeries } from "../series/polar";
import { exportSankeySeries } from "../series/sankey";
import { exportAllOverlays } from "../overlay";
import { collectPluginSVGData } from "../plugins/register";
import { exportRadarChart } from "../series/radar";
import { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { buildTestContext, mockSeries } from "./testFixtures";

function contextWithBounds(
  series: ReturnType<typeof mockSeries>[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
) {
  const xScale = new LinearScale();
  xScale.setDomain(xMin, xMax);
  xScale.setRange(60, 460);
  const yScale = new LinearScale();
  yScale.setDomain(yMin, yMax);
  yScale.setRange(280, 40);

  return buildTestContext(series, {
    viewBounds: { xMin, xMax, yMin, yMax },
    xScale,
    yAxes: new Map([["default", yScale]]),
  });
}

describe("SVG special chart parity", () => {
  it("uses automatic bar width matching canvas calculateBarWidth", () => {
    const x = Float32Array.from([0, 25, 50, 75, 100]);
    const y = Float32Array.from([2, -1, 3, 0, 1]);
    const series = mockSeries("bar", {
      data: { x, y },
      style: { color: "#22c55e" },
    });
    const ctx = contextWithBounds([series], 0, 100, -4, 4);
    const builder = new SVGDocumentBuilder(400, 300, "Inter");
    exportBarSeries(series, ctx.plotArea, ctx.xScale, ctx.yAxes.get("default")!, builder);

    const expectedWidth = (calculateBarWidth(x) / 100) * ctx.plotArea.width;
    const svg = builder.build("#000");
    expect(svg).toContain(`width="${expectedWidth.toFixed(1)}"`);
    expect(calculateBarWidth(x)).toBe(20);
  });

  it("renders polar series with degree-based cartesian mapping", () => {
    const series = mockSeries("polar", {
      polarData: {
        r: Float32Array.from([1, 2, 3, 2, 1]),
        theta: Float32Array.from([0, 72, 144, 216, 288]),
      },
      style: { color: "#e879f9", fill: true },
    });
    const ctx = contextWithBounds([series], -3, 3, -3, 3);
    const builder = new SVGDocumentBuilder(400, 300, "Inter");
    exportPolarSeries(series, ctx.plotArea, ctx.xScale, ctx.yAxes.get("default")!, builder);

    const svg = builder.build("#000");
    expect(svg).toContain("<polyline");
    expect(svg).toContain("<polygon");
    expect(svg).not.toContain("NaN");
  });

  it("exports sankey layout with node labels and flow bands", () => {
    const series = mockSeries("sankey", {
      sankeyData: {
        nodes: [
          { id: "solar", name: "Solar" },
          { id: "grid", name: "Grid" },
          { id: "home", name: "Home" },
        ] as unknown as string[],
        links: [
          { source: "solar", target: "home", value: 30 },
          { source: "grid", target: "home", value: 12 },
        ],
      },
      style: { linkOpacity: 0.55, showLabels: true },
    });
    const ctx = buildTestContext([series]);
    const builder = new SVGDocumentBuilder(400, 300, "Inter");
    exportAllOverlays(ctx, builder);
    exportSankeySeries(series, ctx.plotArea, builder);

    const svg = builder.build("#000");
    expect(svg).toContain("Solar");
    expect(svg).toContain("Home");
    expect(svg).toContain("linearGradient");
    expect(svg).not.toMatch(/1\.0e-5/);
  });

  it("draws polar grid instead of cartesian grid for polar charts", () => {
    const series = mockSeries("polar", {
      polarData: {
        r: Float32Array.from([1, 2, 3]),
        theta: Float32Array.from([0, 120, 240]),
      },
    });
    const ctx = contextWithBounds([series], -3, 3, -3, 3);
    const builder = new SVGDocumentBuilder(400, 300, "Inter");
    exportAllOverlays(ctx, builder);

    const svg = builder.build("#000");
    expect(svg).toContain("<circle");
    expect(svg).not.toContain('text-anchor="middle">0</text>');
  });

  it("skips cartesian overlays and exports radar plugin chart", () => {
    const ctx = buildTestContext([]);
    ctx.xAxisOptions = { ...ctx.xAxisOptions, visible: false };
    ctx.yAxisOptionsMap = new Map([["default", { visible: false, position: "left" }]]);
    ctx.pluginManager = {
      get: (name: string) => {
        if (name !== "velo-plot-radar") return undefined;
        return {
          api: {
            getSVGExportData: () => ({
              categories: ["Speed", "Power", "Reliability"],
              maxValue: 100,
              gridLevels: 5,
              showLabels: true,
              series: [
                {
                  id: "a",
                  name: "A",
                  points: [
                    { category: "Speed", value: 80 },
                    { category: "Power", value: 70 },
                    { category: "Reliability", value: 90 },
                  ],
                  style: { color: "#00f2ff", fillColor: "rgba(0, 242, 255, 0.2)", width: 2 },
                },
              ],
            }),
          },
        };
      },
    };

    const builder = new SVGDocumentBuilder(400, 300, "Inter");
    exportAllOverlays(ctx, builder);
    collectPluginSVGData(ctx.pluginManager, {
      series: ctx.series,
      viewBounds: ctx.viewBounds,
      plotArea: ctx.plotArea,
      xScale: ctx.xScale,
      yScales: ctx.yAxes,
      theme: ctx.theme,
      width: ctx.width,
      height: ctx.height,
      builder,
      exportContext: ctx,
    });

    const svg = builder.build("#000");
    expect(svg).toContain("Speed");
    expect(svg).toContain("<polygon");
    expect(svg).not.toMatch(/1\.0e-5/);
  });

  it("renders radar point markers when pointSize is set", () => {
    const ctx = buildTestContext([]);
    const builder = new SVGDocumentBuilder(400, 300, "Inter");
    exportRadarChart(ctx, builder, {
      categories: ["A", "B"],
      maxValue: 100,
      gridLevels: 2,
      showLabels: false,
      gridStyle: { color: "#fff", width: 1, lineDash: [4, 2] },
      series: [
        {
          id: "pts",
          name: "Pts",
          points: [
            { category: "A", value: 50 },
            { category: "B", value: 80 },
          ],
          style: { color: "#00f2ff", pointSize: 6 },
        },
      ],
    });
    expect(builder.build("#000")).toContain("<circle");
  });

  it("skips cartesian overlays when axes are hidden without radar plugin", () => {
    const ctx = buildTestContext([mockSeries("line")]);
    ctx.xAxisOptions = { ...ctx.xAxisOptions, visible: false };
    ctx.yAxisOptionsMap = new Map([["default", { visible: false, position: "left" }]]);

    const builder = new SVGDocumentBuilder(400, 300, "Inter");
    exportAllOverlays(ctx, builder);
    const svg = builder.build("#000");
    expect(svg).not.toContain('text-anchor="middle">0</text>');
    expect(svg).not.toContain('text-anchor="end">0</text>');
  });
});
