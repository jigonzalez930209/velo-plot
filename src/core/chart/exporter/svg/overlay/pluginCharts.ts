import type { SVGExportContext } from "../SVGExportContext";
import type { RadarSVGExportData } from "../../../../../plugins/radar/types";

export function getRadarSVGExportData(ctx: SVGExportContext): RadarSVGExportData | null {
  const radarPlugin = ctx.pluginManager?.get("velo-plot-radar") as
    | { api?: { getSVGExportData?: () => RadarSVGExportData | null } }
    | undefined;
  return radarPlugin?.api?.getSVGExportData?.() ?? null;
}

export function hasActiveRadarPlugin(ctx: SVGExportContext): boolean {
  const data = getRadarSVGExportData(ctx);
  return data != null && data.categories.length > 0;
}

export function shouldSkipCartesianOverlays(ctx: SVGExportContext, isSpecialSeriesChart: boolean): boolean {
  if (isSpecialSeriesChart || hasActiveRadarPlugin(ctx)) return true;

  if (ctx.xAxisOptions?.visible === false) {
    let allYHidden = true;
    ctx.yAxisOptionsMap.forEach((opts) => {
      if (opts.visible !== false) allYHidden = false;
    });
    if (allYHidden) return true;
  }

  return false;
}
