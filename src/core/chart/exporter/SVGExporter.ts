/**
 * SVG Export — public facade delegating to modular v2 pipeline.
 */
import type { Series } from "../../Series";
import type { Bounds, PlotArea } from "../../../types";
import type { Scale } from "../../../scales";
import type { ChartTheme } from "../../../theme";
import {
  buildSVGExportContext,
  type SVGExportOptions,
  type SVGExportInput,
  captureLayoutSnapshot,
} from "./svg/SVGExportContext";
import { renderSVG } from "./svg/SVGOrchestrator";

export type { SVGExportOptions } from "./svg/SVGExportContext";
export { captureLayoutSnapshot, buildSVGExportContext } from "./svg/SVGExportContext";
export { renderSVG } from "./svg/SVGOrchestrator";

/** @deprecated Use buildSVGExportContext + renderSVG */
export function exportToSVG(
  series: Series[],
  viewBounds: Bounds,
  plotArea: PlotArea,
  xAxis: Scale,
  yAxes: Map<string, Scale>,
  theme: ChartTheme,
  width: number,
  height: number,
  axisOptions: SVGExportOptions = {},
): string {
  const ctx = buildSVGExportContext({
    series,
    viewBounds,
    plotArea,
    xScale: xAxis,
    yAxes,
    theme,
    width,
    height,
    options: axisOptions,
    xAxisOptions: axisOptions.xAxis,
    yAxisOptionsMap: new Map(
      axisOptions.primaryYAxisId
        ? [[axisOptions.primaryYAxisId, axisOptions.yAxis ?? {}]]
        : [["default", axisOptions.yAxis ?? {}]],
    ),
    primaryYAxisId: axisOptions.primaryYAxisId,
  });
  return renderSVG(ctx);
}

export function exportChartToSVG(input: SVGExportInput): string {
  return renderSVG(buildSVGExportContext(input));
}

export function exportChartSnapshot(
  chart: Parameters<typeof captureLayoutSnapshot>[0],
  options?: SVGExportOptions,
): string {
  return renderSVG(captureLayoutSnapshot(chart, options));
}
