import { describe, it, expect } from "vitest";
import { renderSVG } from "../SVGOrchestrator";
import { buildTestContext, seriesFixtures } from "./testFixtures";
import { assertGoldenText, normalizeSvg } from "./visualTestUtils";

describe("SVG golden snapshots", () => {
  it("line chart golden SVG", () => {
    const svg = renderSVG(buildTestContext([seriesFixtures().line]));
    assertGoldenText("line-chart.golden.svg", svg);
  });

  it("multi-series candlestick + bar golden SVG", () => {
    const svg = renderSVG(
      buildTestContext([seriesFixtures().candlestick, seriesFixtures().bar], {
        showLegend: true,
        titleOptions: { visible: true, text: "Market" },
      }),
    );
    assertGoldenText("candle-bar.golden.svg", svg);
  });

  it("all extended series types golden SVG", () => {
    const f = seriesFixtures();
    const svg = renderSVG(
      buildTestContext([
        f.heatmap,
        f.polar,
        f.gauge,
        f.sankey,
        f.ternary,
        f.waterfall,
        f.boxplot,
        f.indicator,
      ]),
    );
    assertGoldenText("extended-series.golden.svg", svg);
  });

  it("normalized SVG is stable across runs", () => {
    const a = normalizeSvg(renderSVG(buildTestContext([seriesFixtures().scatter])));
    const b = normalizeSvg(renderSVG(buildTestContext([seriesFixtures().scatter])));
    expect(a).toBe(b);
  });
});
