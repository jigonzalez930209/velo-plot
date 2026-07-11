import type { Series } from "../../../../Series";
import { seriesId } from "../seriesUtils";
import type { Scale } from "../../../../../scales";
import type { PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";

const HEATMAP_CELL_BUDGET = 10_000;

function heatmapColor(value: number, min: number, max: number, colormap: string): string {
  const t = max === min ? 0.5 : (value - min) / (max - min);
  if (colormap === "viridis") {
    const r = Math.round(68 + t * 150);
    const g = Math.round(1 + t * 180);
    const b = Math.round(84 + (1 - t) * 50);
    return `rgb(${r},${g},${b})`;
  }
  const v = Math.round(t * 255);
  return `rgb(${v},${Math.round(v * 0.4)},${255 - v})`;
}

export function exportHeatmapSeries(
  series: Series,
  plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  builder: SVGDocumentBuilder,
): void {
  const hm = series.getHeatmapData?.();
  if (!hm) return;

  const { xValues, yValues, zValues } = hm;
  const nx = xValues.length;
  const ny = yValues.length;
  const cellCount = nx * ny;

  const style = series.getHeatmapStyle?.() ?? series.getStyle();
  const colorScale = (style as { colorScale?: { name?: string; min?: number; max?: number } }).colorScale;
  const colormap =
    colorScale?.name ??
    (style as { colormap?: string }).colormap ??
    "viridis";

  let zMin = colorScale?.min;
  let zMax = colorScale?.max;
  if (zMin === undefined || zMax === undefined) {
    zMin = Infinity;
    zMax = -Infinity;
    for (let i = 0; i < zValues.length; i++) {
      if (zValues[i] < zMin) zMin = zValues[i];
      if (zValues[i] > zMax) zMax = zValues[i];
    }
  }
  if (!Number.isFinite(zMin) || !Number.isFinite(zMax)) {
    zMin = 0;
    zMax = 1;
  }

  const xStep = nx > 1 ? Math.abs(xValues[1] - xValues[0]) : 1;
  const yStep = ny > 1 ? Math.abs(yValues[1] - yValues[0]) : 1;
  const xHalf = xStep / 2;
  const yHalf = yStep / 2;

  if (cellCount > HEATMAP_CELL_BUDGET) {
    console.warn(
      `[VeloPlot] Heatmap SVG export: ${cellCount} cells exceeds budget (${HEATMAP_CELL_BUDGET}). Consider raster fallback.`,
    );
  }

  const clipId = `vp-clip-hm-${seriesId(series)}`;
  builder.registerClipPath(
    clipId,
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}"/>`,
  );

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const z = zValues[j * nx + i];
      const xLo = xScale.transform(xValues[i] - xHalf);
      const xHi = xScale.transform(xValues[i] + xHalf);
      const yLo = yScale.transform(yValues[j] - yHalf);
      const yHi = yScale.transform(yValues[j] + yHalf);
      const left = Math.min(xLo, xHi);
      const top = Math.min(yLo, yHi);
      const w = Math.max(1, Math.abs(xHi - xLo));
      const h = Math.max(1, Math.abs(yHi - yLo));
      const color = heatmapColor(z, zMin, zMax, colormap);
      builder.push(
        "series",
        `<rect clip-path="url(#${clipId})" x="${fmt(left)}" y="${fmt(top)}" width="${fmt(w)}" height="${fmt(h)}" fill="${color}"/>`,
      );
    }
  }
}
