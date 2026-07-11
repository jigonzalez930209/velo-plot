import type { SVGExportContext } from "./SVGExportContext";
import { SVGDocumentBuilder } from "./SVGDocumentBuilder";
import { exportAllOverlays } from "./overlay";
import { exportAllSeries } from "./series/registry";
import { collectPluginSVGData } from "./plugins/register";
import { exportWatermark } from "./plugins/watermark";
import "./plugins/register";

export function renderSVG(ctx: SVGExportContext): string {
  const builder = new SVGDocumentBuilder(
    ctx.width,
    ctx.height,
    ctx.theme.xAxis.fontFamily || "sans-serif",
  );
  builder.resetGradientCounter();

  exportAllOverlays(ctx, builder);
  exportAllSeries(ctx, builder);

  if (ctx.options.includeOverlays !== false) {
    const pluginCtx = {
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
    };
    if (ctx.pluginManager) {
      collectPluginSVGData(ctx.pluginManager, pluginCtx);
    }
    if (ctx.options.watermarkText) {
      exportWatermark(pluginCtx, ctx.options.watermarkText, { opacity: 0.4, rotation: 0, color: "rgba(128,128,128,0.4)" });
    }
  }

  return builder.build(ctx.theme.backgroundColor, ctx.options.ariaLabel);
}
