import type { Series } from "../../../../Series";
import { seriesId } from "../seriesUtils";
import type { Scale } from "../../../../../scales";
import type { PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";
import { resolveYScale } from "../tickUtils";

export function exportErrorBarsForSeries(
  series: Series,
  plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  builder: SVGDocumentBuilder,
): void {
  if (typeof series.hasErrorData !== "function" || !series.hasErrorData()) return;

  const data = series.getData();
  const style = series.getStyle();
  const errorStyle = style.errorBars ?? {};
  if (errorStyle.visible === false) return;

  const color = errorStyle.color ?? style.color ?? "#ff0055";
  const lineWidth = errorStyle.width ?? 1;
  const capWidth = errorStyle.capWidth ?? 6;
  const showCaps = errorStyle.showCaps !== false;
  const opacity = errorStyle.opacity ?? 0.7;
  const direction = errorStyle.direction ?? "both";

  const clipId = `vp-clip-eb-${seriesId(series)}`;
  builder.registerClipPath(
    clipId,
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}"/>`,
  );

  for (let i = 0; i < data.x.length; i++) {
    const x = xScale.transform(data.x[i]);
    const y = yScale.transform(data.y[i]);
    if (x < plotArea.x || x > plotArea.x + plotArea.width) continue;
    if (y < plotArea.y || y > plotArea.y + plotArea.height) continue;

    const yError = series.getYError(i);
    if (yError) {
      const [errorMinus, errorPlus] = yError;
      const yBase = data.y[i];
      const yTop = yScale.transform(yBase + errorPlus);
      const yBottom = yScale.transform(yBase - errorMinus);

      if (direction === "both" || direction === "positive") {
        builder.push(
          "errorBars",
          `<g clip-path="url(#${clipId})" stroke="${color}" stroke-width="${lineWidth}" stroke-opacity="${opacity}"><line x1="${fmt(x)}" y1="${fmt(y)}" x2="${fmt(x)}" y2="${fmt(yTop)}"/>${showCaps ? `<line x1="${fmt(x - capWidth / 2)}" y1="${fmt(yTop)}" x2="${fmt(x + capWidth / 2)}" y2="${fmt(yTop)}"/>` : ""}</g>`,
        );
      }
      if (direction === "both" || direction === "negative") {
        builder.push(
          "errorBars",
          `<g clip-path="url(#${clipId})" stroke="${color}" stroke-width="${lineWidth}" stroke-opacity="${opacity}"><line x1="${fmt(x)}" y1="${fmt(y)}" x2="${fmt(x)}" y2="${fmt(yBottom)}"/>${showCaps ? `<line x1="${fmt(x - capWidth / 2)}" y1="${fmt(yBottom)}" x2="${fmt(x + capWidth / 2)}" y2="${fmt(yBottom)}"/>` : ""}</g>`,
        );
      }
    }

    const xError = series.getXError(i);
    if (xError) {
      const [errorMinus, errorPlus] = xError;
      const xBase = data.x[i];
      const xRight = xScale.transform(xBase + errorPlus);
      const xLeft = xScale.transform(xBase - errorMinus);

      if (direction === "both" || direction === "positive") {
        builder.push(
          "errorBars",
          `<g clip-path="url(#${clipId})" stroke="${color}" stroke-width="${lineWidth}" stroke-opacity="${opacity}"><line x1="${fmt(x)}" y1="${fmt(y)}" x2="${fmt(xRight)}" y2="${fmt(y)}"/>${showCaps ? `<line x1="${fmt(xRight)}" y1="${fmt(y - capWidth / 2)}" x2="${fmt(xRight)}" y2="${fmt(y + capWidth / 2)}"/>` : ""}</g>`,
        );
      }
      if (direction === "both" || direction === "negative") {
        builder.push(
          "errorBars",
          `<g clip-path="url(#${clipId})" stroke="${color}" stroke-width="${lineWidth}" stroke-opacity="${opacity}"><line x1="${fmt(x)}" y1="${fmt(y)}" x2="${fmt(xLeft)}" y2="${fmt(y)}"/>${showCaps ? `<line x1="${fmt(xLeft)}" y1="${fmt(y - capWidth / 2)}" x2="${fmt(xLeft)}" y2="${fmt(y + capWidth / 2)}"/>` : ""}</g>`,
        );
      }
    }
  }
}

export function exportErrorBars(
  ctx: import("../SVGExportContext").SVGExportContext,
  builder: SVGDocumentBuilder,
): void {
  for (const series of ctx.series) {
    if (!series.isVisible()) continue;
    const yScale = resolveYScale(ctx.yAxes, series.getYAxisId(), ctx.primaryYAxisId);
    if (!yScale) continue;
    exportErrorBarsForSeries(series, ctx.plotArea, ctx.xScale, yScale, builder);
  }
}
