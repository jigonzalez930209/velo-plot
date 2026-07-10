import { ChartImpl } from "./ChartCore";
import { exportToSVG } from "./exporter/SVGExporter";

let patched = false;

/** Restore sync SVG export on Chart (trading/scientific/full bundles). */
export function patchExportSVG(): void {
  if (patched) return;
  patched = true;

  ChartImpl.prototype.exportSVG = function (): string {
    const chart = this as any;
    const rect = chart.container.getBoundingClientRect();
    return exportToSVG(
      chart.getAllSeries(),
      chart.viewBounds,
      chart.getPlotArea(),
      chart.xScale,
      chart.yScales,
      chart.theme,
      rect.width || chart.container.clientWidth,
      rect.height || chart.container.clientHeight,
      {
        xAxis: chart.xAxisOptions,
        yAxis: chart.yAxisOptionsMap.get(chart.primaryYAxisId),
        primaryYAxisId: chart.primaryYAxisId,
      },
    );
  };
}
