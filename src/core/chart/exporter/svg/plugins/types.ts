/**
 * Plugin SVG export context types.
 */

import type { Series } from "../../../../Series";
import type { Scale } from "../../../../../scales";
import type { ChartTheme } from "../../../../../theme";
import type { Bounds, PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import type { SVGExportContext } from "../SVGExportContext";

export interface SVGExportPluginContext {
  series: Series[];
  viewBounds: Bounds;
  plotArea: PlotArea;
  xScale: Scale;
  yScales: Map<string, Scale>;
  theme: ChartTheme;
  width: number;
  height: number;
  builder?: SVGDocumentBuilder;
  exportContext?: SVGExportContext;
  pushElements?: (layer: string, elements: string[]) => void;
  /** @internal */
  _layer?: string;
  /** @internal */
  _elements?: string[];
}

export type SVGPluginExporter = (ctx: SVGExportPluginContext) => void;

const pluginExporters = new Map<string, SVGPluginExporter>();

export function registerSVGPluginExporter(pluginName: string, exporter: SVGPluginExporter): void {
  pluginExporters.set(pluginName, exporter);
}

export function getSVGPluginExporters(): Map<string, SVGPluginExporter> {
  return pluginExporters;
}

export function runSVGPluginExporters(ctx: SVGExportPluginContext, builder: SVGDocumentBuilder): void {
  for (const [, exporter] of pluginExporters) {
    exporter({ ...ctx, builder });
  }
  if (ctx._elements && ctx._layer) {
    for (const el of ctx._elements) {
      builder.push(ctx._layer, el);
    }
  }
}
