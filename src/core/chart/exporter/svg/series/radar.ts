import type { SVGExportContext } from "../SVGExportContext";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt, escapeXml } from "../SVGDocumentBuilder";
import type { RadarSeriesData, RadarSVGExportData } from "../../../../../plugins/radar/types";

function labelAnchor(angle: number): "start" | "middle" | "end" {
  if (Math.abs(Math.cos(angle)) < 0.1) return "middle";
  return Math.cos(angle) > 0 ? "start" : "end";
}

function labelBaseline(angle: number): "auto" | "middle" | "hanging" | "alphabetic" {
  if (Math.abs(Math.sin(angle)) < 0.1) return "middle";
  return Math.sin(angle) > 0 ? "hanging" : "alphabetic";
}

export function exportRadarChart(
  ctx: SVGExportContext,
  builder: SVGDocumentBuilder,
  data: RadarSVGExportData,
): void {
  const { plotArea } = ctx;
  const centerX = plotArea.x + plotArea.width / 2;
  const centerY = plotArea.y + plotArea.height / 2;
  const maxRadiusPixels = (Math.min(plotArea.width, plotArea.height) / 2) * 0.8;
  const numCategories = data.categories.length;
  if (numCategories === 0) return;

  const angleStep = (2 * Math.PI) / numCategories;
  const gridColor = data.gridStyle?.color ?? "rgba(255, 255, 255, 0.1)";
  const gridWidth = data.gridStyle?.width ?? 1;
  const gridDash = data.gridStyle?.lineDash?.length
    ? ` stroke-dasharray="${data.gridStyle.lineDash.join(",")}"`
    : "";

  for (let level = 1; level <= data.gridLevels; level++) {
    const radius = (level / data.gridLevels) * maxRadiusPixels;
    const pts: string[] = [];
    for (let i = 0; i < numCategories; i++) {
      const angle = i * angleStep - Math.PI / 2;
      pts.push(`${fmt(centerX + radius * Math.cos(angle))},${fmt(centerY + radius * Math.sin(angle))}`);
    }
    builder.push(
      "grid",
      `<polygon points="${pts.join(" ")}" fill="none" stroke="${gridColor}" stroke-width="${gridWidth}"${gridDash}/>`,
    );
  }

  for (let i = 0; i < numCategories; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const px = centerX + maxRadiusPixels * Math.cos(angle);
    const py = centerY + maxRadiusPixels * Math.sin(angle);
    builder.push(
      "grid",
      `<line x1="${fmt(centerX)}" y1="${fmt(centerY)}" x2="${fmt(px)}" y2="${fmt(py)}" stroke="${gridColor}" stroke-width="${gridWidth}"/>`,
    );

    if (data.showLabels) {
      const labelRadius = maxRadiusPixels + 25;
      const lx = centerX + labelRadius * Math.cos(angle);
      const ly = centerY + labelRadius * Math.sin(angle);
      const labelColor = data.labelStyle?.color ?? "#94a3b8";
      const labelSize = data.labelStyle?.fontSize ?? 12;
      const labelFamily = data.labelStyle?.fontFamily ?? "sans-serif";
      builder.push(
        "axes",
        `<text x="${fmt(lx)}" y="${fmt(ly)}" fill="${labelColor}" font-size="${labelSize}" font-family="${escapeXml(labelFamily)}" text-anchor="${labelAnchor(angle)}" dominant-baseline="${labelBaseline(angle)}">${escapeXml(data.categories[i])}</text>`,
      );
    }
  }

  for (const series of data.series) {
    exportRadarSeries(builder, data, series, centerX, centerY, maxRadiusPixels, angleStep);
  }
}

function exportRadarSeries(
  builder: SVGDocumentBuilder,
  data: RadarSVGExportData,
  series: RadarSeriesData,
  centerX: number,
  centerY: number,
  maxRadiusPixels: number,
  angleStep: number,
): void {
  if (series.points.length === 0) return;

  const dataPts: string[] = [];
  for (let idx = 0; idx < data.categories.length; idx++) {
    const cat = data.categories[idx];
    const point = series.points.find((p) => p.category === cat);
    const val = point ? point.value : 0;
    const radius = (val / data.maxValue) * maxRadiusPixels;
    const angle = idx * angleStep - Math.PI / 2;
    dataPts.push(`${fmt(centerX + radius * Math.cos(angle))},${fmt(centerY + radius * Math.sin(angle))}`);
  }

  const color = series.style?.color ?? "#00f2ff";
  const fillColor =
    series.style?.fillColor ?? (series.style?.color ? `${series.style.color}33` : "rgba(0, 242, 255, 0.2)");
  const opacity = series.style?.opacity ?? 1;
  const width = series.style?.width ?? 2;
  const pointSize = series.style?.pointSize ?? 0;

  builder.push(
    "series",
    `<polygon points="${dataPts.join(" ")}" fill="${fillColor}" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}" fill-opacity="${opacity}"/>`,
  );

  if (pointSize > 0) {
    const r = pointSize / 2;
    for (let idx = 0; idx < data.categories.length; idx++) {
      const cat = data.categories[idx];
      const point = series.points.find((p) => p.category === cat);
      const val = point ? point.value : 0;
      const radius = (val / data.maxValue) * maxRadiusPixels;
      const angle = idx * angleStep - Math.PI / 2;
      const px = centerX + radius * Math.cos(angle);
      const py = centerY + radius * Math.sin(angle);
      builder.push("series", `<circle cx="${fmt(px)}" cy="${fmt(py)}" r="${fmt(r)}" fill="${color}"/>`);
    }
  }
}
