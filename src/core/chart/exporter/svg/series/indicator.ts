import type { Series } from "../../../../Series";
import { seriesId } from "../seriesUtils";
import type { Scale } from "../../../../../scales";
import type { PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { buildIndicatorSeries } from "../../../../indicator/buildIndicatorSeries";
import type { IndicatorSeriesOptions } from "../../../../indicator/types";
import { exportLineSeries } from "./line";
import { exportBarSeries } from "./bar";
import { exportBandSeries } from "./band";
import { exportScatterSeries } from "./scatter";

export function exportIndicatorSeries(
  series: Series,
  plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  builder: SVGDocumentBuilder,
): void {
  const indicatorOpts = (series as unknown as { indicatorOptions?: IndicatorSeriesOptions }).indicatorOptions;
  if (!indicatorOpts) {
    console.warn(`[VeloPlot] Indicator series "${seriesId(series)}" missing indicatorOptions for SVG export`);
    return;
  }

  const childOptions = buildIndicatorSeries(indicatorOpts);
  for (const child of childOptions) {
    const mockSeries = {
      isVisible: () => true,
      getYAxisId: () => series.getYAxisId(),
      getData: () => child.data ?? { x: new Float32Array(0), y: new Float32Array(0) },
      getStyle: () => child.style ?? {},
      getType: () => child.type ?? "line",
      getId: () => `${seriesId(series)}-${child.id ?? child.type}`,
      getName: () => child.name ?? child.id ?? "indicator",
      hasErrorData: () => false,
    } as unknown as Series;

    const type = child.type ?? "line";
    if (type === "bar") exportBarSeries(mockSeries, plotArea, xScale, yScale, builder);
    else if (type === "band" || type === "area") exportBandSeries(mockSeries, plotArea, xScale, yScale, builder);
    else if (type === "scatter") exportScatterSeries(mockSeries, plotArea, xScale, yScale, builder);
    else exportLineSeries(mockSeries, plotArea, xScale, yScale, builder);
  }
}
