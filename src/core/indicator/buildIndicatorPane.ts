import type { Range, SeriesOptions } from "../../types";
import type { StackedPaneConfig } from "../stacked/types";
import type { IndicatorData, IndicatorSeriesOptions, IndicatorStyle } from "./types";
import { buildIndicatorSeries } from "./buildIndicatorSeries";

export interface BuildIndicatorPaneOptions {
  id: string;
  /** Flex ratio inside createStackedChart (default 0.25) */
  height?: number | string;
  label?: string;
  data: IndicatorData;
  style?: IndicatorStyle;
  /** Lock Y range (recommended for oscillators) */
  yRange?: Range | "auto";
  tickCount?: number;
  showXAxis?: boolean;
  seriesId?: string;
}

/**
 * Build a stacked pane pre-configured for a trading indicator
 * (histogram + lines + fills + markers).
 */
export function buildIndicatorPane(options: BuildIndicatorPaneOptions): StackedPaneConfig {
  const seriesId = options.seriesId ?? `${options.id}-indicator`;
  const indicatorOpts: IndicatorSeriesOptions = {
    id: seriesId,
    type: "indicator",
    data: options.data,
    style: options.style,
    name: options.label,
  };
  const series: SeriesOptions[] = buildIndicatorSeries(indicatorOpts);

  return {
    id: options.id,
    height: options.height ?? 0.25,
    showXAxis: options.showXAxis,
    yRange: options.yRange,
    chart: {
      yAxis: {
        label: options.label ?? "Indicator",
        auto: options.yRange === undefined || options.yRange === "auto",
        tickCount: options.tickCount ?? 5,
        scientific: false,
      },
      xAxis: { showLabels: false, showTicks: false, showLine: false },
      animations: false,
      loading: false,
      showLegend: false,
    },
    series,
  };
}
