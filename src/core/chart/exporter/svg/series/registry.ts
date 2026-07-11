import type { SeriesType } from "../../../../../types";
import type { Series } from "../../../../Series";
import type { Scale } from "../../../../../scales";
import type { PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import type { SVGExportContext } from "../SVGExportContext";
import { exportLineSeries } from "./line";
import { exportScatterSeries } from "./scatter";
import { exportBarSeries } from "./bar";
import { exportBandSeries } from "./band";
import { exportCandlestickSeries } from "./candlestick";
import { exportHeatmapSeries } from "./heatmap";
import { exportPolarSeries } from "./polar";
import { exportGaugeSeries } from "./gauge";
import { exportSankeySeries } from "./sankey";
import { exportTernarySeries } from "./ternary";
import { exportWaterfallSeries } from "./waterfall";
import { exportBoxplotSeries } from "./boxplot";
import { exportIndicatorSeries } from "./indicator";
import { resolveYScale } from "../tickUtils";

export type SeriesSVGExporter = (
  series: Series,
  plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  builder: SVGDocumentBuilder,
  ctx?: SVGExportContext,
) => void;

const registry = new Map<SeriesType, SeriesSVGExporter>();

function register(type: SeriesType, exporter: SeriesSVGExporter): void {
  registry.set(type, exporter);
}

register("line", (s, pa, xs, ys, b) => exportLineSeries(s, pa, xs, ys, b));
register("step", (s, pa, xs, ys, b) => exportLineSeries(s, pa, xs, ys, b));
register("step+scatter", (s, pa, xs, ys, b) => exportLineSeries(s, pa, xs, ys, b));
register("line+scatter", (s, pa, xs, ys, b) => exportLineSeries(s, pa, xs, ys, b));
register("scatter", (s, pa, xs, ys, b) => exportScatterSeries(s, pa, xs, ys, b));
register("bar", (s, pa, xs, ys, b) => exportBarSeries(s, pa, xs, ys, b));
register("band", (s, pa, xs, ys, b) => exportBandSeries(s, pa, xs, ys, b));
register("area", (s, pa, xs, ys, b) => exportBandSeries(s, pa, xs, ys, b));
register("candlestick", (s, pa, xs, ys, b) => exportCandlestickSeries(s, pa, xs, ys, b));
register("heikin-ashi", (s, pa, xs, ys, b) => exportCandlestickSeries(s, pa, xs, ys, b));
register("heatmap", (s, pa, xs, ys, b) => exportHeatmapSeries(s, pa, xs, ys, b));
register("polar", (s, pa, xs, ys, b) => exportPolarSeries(s, pa, xs, ys, b));
register("gauge", (s, pa, _xs, _ys, b) => exportGaugeSeries(s, pa, b));
register("sankey", (s, pa, _xs, _ys, b) => exportSankeySeries(s, pa, b));
register("ternary", (s, pa, xs, ys, b) => exportTernarySeries(s, pa, xs, ys, b));
register("waterfall", (s, pa, xs, ys, b) => exportWaterfallSeries(s, pa, xs, ys, b));
register("boxplot", (s, pa, xs, ys, b) => exportBoxplotSeries(s, pa, xs, ys, b));
register("indicator", (s, pa, xs, ys, b) => exportIndicatorSeries(s, pa, xs, ys, b));
register("radar", () => {
  /* rendered via PluginRadar SVG exporter */
});

export function getSeriesSVGExporter(type: SeriesType): SeriesSVGExporter | undefined {
  return registry.get(type);
}

export function exportAllSeries(ctx: SVGExportContext, builder: SVGDocumentBuilder): void {
  const warned = new Set<string>();

  for (const series of ctx.series) {
    if (!series.isVisible()) continue;

    const type = series.getType();
    const exporter = registry.get(type);
    const yScale = resolveYScale(ctx.yAxes, series.getYAxisId(), ctx.primaryYAxisId);
    if (!yScale) continue;

    if (!exporter) {
      if (!warned.has(type)) {
        console.warn(`[VeloPlot] No SVG exporter for series type "${type}"`);
        warned.add(type);
      }
      continue;
    }

    const data = series.getData();
    const isEmpty =
      type === "heatmap"
        ? !series.getHeatmapData?.()
        : type === "polar"
          ? !series.getPolarData?.()
          : type === "gauge"
            ? !series.getGaugeData?.()
            : type === "sankey"
              ? !series.getSankeyData?.()
              : type === "indicator"
                ? false
                : !data || data.x.length === 0;

    if (isEmpty && type !== "gauge" && type !== "indicator") continue;

    exporter(series, ctx.plotArea, ctx.xScale, yScale, builder, ctx);
  }
}

export function getRegisteredSeriesTypes(): SeriesType[] {
  return Array.from(registry.keys());
}
