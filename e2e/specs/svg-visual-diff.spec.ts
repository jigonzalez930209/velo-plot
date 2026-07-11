import { test, expect } from "@playwright/test";
import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { runE2EScenario } from "../helpers/run-scenario";

function rasterizeSvg(svg: string, width: number): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: true },
  });
  return Buffer.from(resvg.render().asPng());
}

function decodeDataUrlPng(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
}

test.describe("SVG visual diff @ 1x", () => {
  test("bar chart raster vs canvas export within tolerance", async ({ page }) => {
    const result = await runE2EScenario(page, "svg-visual-diff-line");
    const { svg, raster, width } = result.data as {
      svg: string;
      raster: string;
      width: number;
      height: number;
    };

    const svgPng = rasterizeSvg(svg, width);
    const canvasPng = decodeDataUrlPng(raster);

    const imgA = PNG.sync.read(svgPng);
    const imgB = PNG.sync.read(canvasPng);

    // Resize to common dimensions for comparison (canvas may include DPR scaling).
    const w = Math.min(imgA.width, imgB.width);
    const h = Math.min(imgA.height, imgB.height);
    const aData = imgA.data.subarray(0, w * h * 4);
    const bData = imgB.data.subarray(0, w * h * 4);

    const diff = new PNG({ width: w, height: h });
    const diffPixels = pixelmatch(aData, bData, diff.data, w, h, { threshold: 0.15 });
    const ratio = diffPixels / (w * h);

    // WebGL series + vector bars differ in anti-aliasing; 12% pixel tolerance at 1x.
    expect(ratio).toBeLessThan(0.12);
    expect(svg).toContain("<rect");
  });
});
