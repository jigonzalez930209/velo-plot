export { exportGrid } from "./grid";
export { exportAxes } from "./axes";
export { exportTitle } from "./title";
export { exportPlotBorder } from "./border";
export { exportLegend } from "./legend";
export { exportErrorBars } from "./errorBars";

import type { SVGExportContext } from "../SVGExportContext";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { exportGrid } from "./grid";
import { exportAxes } from "./axes";
import { exportTitle } from "./title";
import { exportPlotBorder } from "./border";
import { exportLegend } from "./legend";
import { exportErrorBars } from "./errorBars";
import { detectSpecialChartFromContext } from "./specialChart";
import { exportPolarGrid } from "./polarGrid";
import { shouldSkipCartesianOverlays } from "./pluginCharts";
import { fmt } from "../SVGDocumentBuilder";

export function exportCursor(ctx: SVGExportContext, builder: SVGDocumentBuilder): void {
  if (!ctx.options.includeCursor || !ctx.cursor) return;
  const { plotArea, cursor, theme } = ctx;
  const color = theme.cursor?.lineColor ?? "rgba(255,255,255,0.5)";
  builder.push(
    "cursor",
    `<line x1="${fmt(cursor.x)}" y1="${fmt(plotArea.y)}" x2="${fmt(cursor.x)}" y2="${fmt(plotArea.y + plotArea.height)}" stroke="${color}" stroke-width="1" stroke-dasharray="4,4"/>`,
  );
  builder.push(
    "cursor",
    `<line x1="${fmt(plotArea.x)}" y1="${fmt(cursor.y)}" x2="${fmt(plotArea.x + plotArea.width)}" y2="${fmt(cursor.y)}" stroke="${color}" stroke-width="1" stroke-dasharray="4,4"/>`,
  );
}

export function exportSelection(ctx: SVGExportContext, builder: SVGDocumentBuilder): void {
  if (!ctx.options.includeSelection || !ctx.selection) return;
  const { selection } = ctx;
  builder.push(
    "cursor",
    `<rect x="${fmt(selection.x)}" y="${fmt(selection.y)}" width="${fmt(selection.width)}" height="${fmt(selection.height)}" fill="rgba(100,149,237,0.15)" stroke="cornflowerblue" stroke-width="1"/>`,
  );
}

export function exportPriceAlerts(ctx: SVGExportContext, builder: SVGDocumentBuilder): void {
  if (!ctx.alerts?.length) return;
  const { plotArea, alerts } = ctx;
  const yScale = ctx.yAxes.get(ctx.primaryYAxisId ?? "default");
  if (!yScale) return;

  for (const alert of alerts) {
    const y = yScale.transform(alert.price);
    if (y < plotArea.y || y > plotArea.y + plotArea.height) continue;
    const color = alert.direction === "below" ? "#ef5350" : "#26a69a";
    builder.push(
      "plugins",
      `<line x1="${fmt(plotArea.x)}" y1="${fmt(y)}" x2="${fmt(plotArea.x + plotArea.width)}" y2="${fmt(y)}" stroke="${color}" stroke-width="1" stroke-dasharray="6,4"/>`,
    );
  }
}

export function exportAllOverlays(ctx: SVGExportContext, builder: SVGDocumentBuilder): void {
  const special = detectSpecialChartFromContext(ctx);
  const skipCartesian = shouldSkipCartesianOverlays(ctx, special.isSpecialChart);

  if (special.hasPolarSeries && special.maxRadius > 0) {
    exportPolarGrid(
      ctx,
      builder,
      special.polarRadialDivisions,
      special.polarAngularDivisions,
      special.polarAngleMode,
    );
  } else if (!skipCartesian) {
    exportGrid(ctx, builder);
  }

  exportErrorBars(ctx, builder);

  if (!skipCartesian) {
    exportAxes(ctx, builder);
  }

  exportPlotBorder(ctx, builder);
  exportTitle(ctx, builder);
  exportLegend(ctx, builder);
  exportCursor(ctx, builder);
  exportSelection(ctx, builder);
  exportPriceAlerts(ctx, builder);
}
