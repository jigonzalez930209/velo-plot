import { describe, it, expect } from "vitest";
import { PNG } from "pngjs";
import { renderSVG } from "../SVGOrchestrator";
import { buildTestContext, seriesFixtures } from "./testFixtures";
import {
  assertGoldenPng,
  comparePngBuffers,
  rasterizeSvg,
  readGoldenPng,
} from "./visualTestUtils";

describe("SVG raster visual diff", () => {
  it("line chart raster matches golden PNG baseline", () => {
    const svg = renderSVG(buildTestContext([seriesFixtures().line]));
    const png = rasterizeSvg(svg, 520);
    assertGoldenPng("line-chart.golden.png", png, 0);
  });

  it("raster output is stable across consecutive exports", () => {
    const svg = renderSVG(buildTestContext([seriesFixtures().bar]));
    const a = rasterizeSvg(svg, 520);
    const b = rasterizeSvg(svg, 520);
    comparePngBuffers(a, b, 0);
  });

  it("overlay-heavy chart raster matches golden baseline", () => {
    const svg = renderSVG(
      buildTestContext([seriesFixtures().line, seriesFixtures().errors], {
        options: { includeCursor: true, includeSelection: true, watermarkText: "VELO" },
      }),
    );
    const png = rasterizeSvg(svg, 520);
    assertGoldenPng("overlay-chart.golden.png", png, 0);
  });

  it("golden PNG dimensions match SVG viewport", () => {
    const svg = renderSVG(buildTestContext([seriesFixtures().line]));
    const png = rasterizeSvg(svg, 520);
    const img = PNG.sync.read(readGoldenPng("line-chart.golden.png"));
    const current = PNG.sync.read(png);
    expect(current.width).toBe(img.width);
  });
});
