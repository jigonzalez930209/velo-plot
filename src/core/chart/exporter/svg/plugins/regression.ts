import type { SVGExportPluginContext } from "./types";
import { fmt } from "../SVGDocumentBuilder";
import { primaryYScale } from "../tickUtils";

export interface RegressionOverlay {
  points: Array<{ x: number; y: number }>;
  color?: string;
  band?: { upper: Array<{ x: number; y: number }>; lower: Array<{ x: number; y: number }> };
}

export function exportRegressionOverlay(ctx: SVGExportPluginContext, overlay: RegressionOverlay): void {
  if (!ctx.builder || overlay.points.length < 2) return;
  const yScale = primaryYScale(ctx.yScales)!;
  const color = overlay.color ?? "#3b82f6";

  if (overlay.band) {
    const bandPts: string[] = [];
    for (const p of overlay.band.upper) {
      bandPts.push(`${fmt(ctx.xScale.transform(p.x))},${fmt(yScale.transform(p.y))}`);
    }
    for (let i = overlay.band.lower.length - 1; i >= 0; i--) {
      const p = overlay.band.lower[i];
      bandPts.push(`${fmt(ctx.xScale.transform(p.x))},${fmt(yScale.transform(p.y))}`);
    }
    ctx.builder.push("plugins", `<polygon points="${bandPts.join(" ")}" fill="${color}" fill-opacity="0.15" stroke="none"/>`);
  }

  const linePts = overlay.points
    .map((p) => `${fmt(ctx.xScale.transform(p.x))},${fmt(yScale.transform(p.y))}`)
    .join(" ");
  ctx.builder.push(
    "plugins",
    `<polyline points="${linePts}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="6,4"/>`,
  );
}

export function exportForecastOverlay(
  ctx: SVGExportPluginContext,
  forecast: Array<{ x: number; y: number }>,
  ci?: { upper: Array<{ x: number; y: number }>; lower: Array<{ x: number; y: number }> },
  color = "#8b5cf6",
): void {
  exportRegressionOverlay(ctx, { points: forecast, color, band: ci ? { upper: ci.upper, lower: ci.lower } : undefined });
}
