/**
 * Registers built-in SVG plugin exporters and collects plugin overlay data at export time.
 */
import type { ChartPlugin } from "../../../../../plugins/types";
import type { Annotation } from "../../../../annotations/types";
import { exportAnnotations } from "./annotations";
import { exportCandlestickMarkers } from "./tradeMarkers";
import { exportRadarChart } from "../series/radar";
import type { SVGExportPluginContext } from "./types";
import { registerSVGPluginExporter, runSVGPluginExporters } from "./types";

registerSVGPluginExporter("velo-plot-annotations", (ctx) => {
  const annotations = (ctx as SVGExportPluginContext & { _annotations?: Annotation[] })._annotations;
  if (annotations?.length) exportAnnotations(ctx, annotations);
});

registerSVGPluginExporter("velo-plot-trade-markers", exportCandlestickMarkers);

/** Collect plugin overlay data from chart plugin manager during export. */
export function collectPluginSVGData(
  pluginManager: {
    get: (name: string) => ChartPlugin | undefined;
    notifyExportSVG?: (ctx: SVGExportPluginContext) => void;
  },
  ctx: SVGExportPluginContext,
): void {
  const annPlugin = pluginManager.get("velo-plot-annotations") as
    | { api?: { getManager?: () => { getAll: () => Annotation[] } } }
    | undefined;
  const manager = annPlugin?.api?.getManager?.();
  if (manager && ctx.builder && ctx.exportContext?.options.includeAnnotations !== false) {
    exportAnnotations(ctx, manager.getAll());
  }

  exportCandlestickMarkers(ctx);

  const radarPlugin = pluginManager.get("velo-plot-radar") as
    | {
        api?: {
          getSVGExportData?: () => import("../../../../../plugins/radar/types").RadarSVGExportData | null;
        };
      }
    | undefined;
  const radarData = radarPlugin?.api?.getSVGExportData?.();
  if (radarData && ctx.builder && ctx.exportContext) {
    exportRadarChart(ctx.exportContext, ctx.builder, radarData);
  }

  runSVGPluginExporters(ctx, ctx.builder!);
  pluginManager.notifyExportSVG?.(ctx);
}
