import type { SVGExportContext } from "../SVGExportContext";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";
import { gridMajorStyle, strokeAttrs } from "../SVGThemeAdapter";
import { primaryYScale } from "../tickUtils";

export function exportPolarGrid(
  ctx: SVGExportContext,
  builder: SVGDocumentBuilder,
  radialDivisions: number,
  angularDivisions: number,
  angleMode: "degrees" | "radians",
): void {
  if (!ctx.theme.grid.visible) return;

  const yScale = primaryYScale(ctx.yAxes, ctx.primaryYAxisId);
  if (!yScale) return;

  const { plotArea, xScale } = ctx;
  const centerX = xScale.transform(0);
  const centerY = yScale.transform(0);
  const grid = strokeAttrs(gridMajorStyle(ctx.theme));

  const corners = [
    { x: plotArea.x, y: plotArea.y },
    { x: plotArea.x + plotArea.width, y: plotArea.y },
    { x: plotArea.x, y: plotArea.y + plotArea.height },
    { x: plotArea.x + plotArea.width, y: plotArea.y + plotArea.height },
  ];

  let maxPixelRadius = 0;
  for (const corner of corners) {
    const dist = Math.hypot(corner.x - centerX, corner.y - centerY);
    maxPixelRadius = Math.max(maxPixelRadius, dist);
  }

  const clipId = "vp-clip-polar-grid";
  builder.registerClipPath(
    clipId,
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}"/>`,
  );

  for (let i = 1; i <= radialDivisions; i++) {
    const radiusPixels = (i / radialDivisions) * maxPixelRadius;
    builder.push(
      "grid",
      `<circle clip-path="url(#${clipId})" cx="${fmt(centerX)}" cy="${fmt(centerY)}" r="${fmt(radiusPixels)}" fill="none" ${grid}/>`,
    );
  }

  const angleStep =
    angleMode === "degrees"
      ? (360 / angularDivisions) * (Math.PI / 180)
      : (2 * Math.PI) / angularDivisions;

  for (let i = 0; i < angularDivisions; i++) {
    const angle = i * angleStep;
    builder.push(
      "grid",
      `<line clip-path="url(#${clipId})" x1="${fmt(centerX)}" y1="${fmt(centerY)}" x2="${fmt(centerX + maxPixelRadius * Math.cos(angle))}" y2="${fmt(centerY - maxPixelRadius * Math.sin(angle))}" ${grid}/>`,
    );
  }
}
