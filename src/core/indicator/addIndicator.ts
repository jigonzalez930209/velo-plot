/**
 * High-level indicator API — calculate + render on a chart or stacked pane config.
 */

import type { Chart } from "../chart/types";
import type { StackedPaneConfig } from "../stacked/types";
import { buildIndicatorSeries } from "./buildIndicatorSeries";
import { buildIndicatorPane, type BuildIndicatorPaneOptions } from "./buildIndicatorPane";
import {
  computeIndicatorPreset,
  extractPriceSeries,
  resolveSourceSeries,
  type ComputedIndicatorPreset,
  type IndicatorPresetName,
  type IndicatorPresetOptions,
} from "./indicatorPresets";

export interface AddIndicatorOptions extends IndicatorPresetOptions {
  /** Series to derive prices from (default: first line/candlestick/bar) */
  sourceSeriesId?: string;
  /** Y axis for overlay lines (default: same as source series) */
  yAxisId?: string;
  /** For stacked charts — build a new pane config instead of mutating chart */
  pane?: "inline" | "new";
  /** Pane flex ratio when pane: 'new' (default 0.25) */
  paneHeight?: number | string;
  showXAxis?: boolean;
}

export interface AddIndicatorResult {
  id: string;
  preset: IndicatorPresetName;
  placement: "overlay" | "oscillator";
  seriesIds: string[];
}

type ChartIndicatorHost = Pick<
  Chart,
  "getSeries" | "getAllSeries" | "addSeries" | "removeSeries"
>;

function removeIndicatorSeries(chart: ChartIndicatorHost, rootId: string): void {
  for (const s of [...chart.getAllSeries()]) {
    const sid = s.getId();
    if (sid === rootId || sid.startsWith(`${rootId}-`)) {
      chart.removeSeries(sid);
    }
  }
}

/**
 * Calculate indicator preset from a source series (no render).
 */
export async function computeIndicatorFromSeries(
  chart: ChartIndicatorHost,
  preset: IndicatorPresetName,
  options: AddIndicatorOptions = {},
): Promise<ComputedIndicatorPreset> {
  const source = resolveSourceSeries(chart, options.sourceSeriesId);
  const { x, prices } = extractPriceSeries(source);
  return computeIndicatorPreset(preset, x, prices, options, source);
}

/**
 * Add a trading indicator to an existing chart (overlay or inline oscillator layers).
 */
export async function addIndicatorToChart(
  chart: ChartIndicatorHost,
  preset: IndicatorPresetName,
  options: AddIndicatorOptions = {},
): Promise<AddIndicatorResult> {
  if (options.pane === "new") {
    throw new Error(
      "[addIndicator] pane: 'new' requires createStackedChart — use buildIndicatorPaneFromPreset() instead",
    );
  }

  const source = resolveSourceSeries(chart, options.sourceSeriesId);
  const yAxisId = options.yAxisId ?? source.getYAxisId?.();

  const computed = await computeIndicatorFromSeries(chart, preset, options);
  removeIndicatorSeries(chart, computed.id);

  const expanded = buildIndicatorSeries({
    id: computed.id,
    type: "indicator",
    data: computed.data,
    name: options.label ?? computed.id.toUpperCase(),
  });

  const seriesIds: string[] = [];
  for (const s of expanded) {
    chart.addSeries({
      ...s,
      yAxisId: yAxisId ?? s.yAxisId,
    });
    seriesIds.push(s.id);
  }

  return {
    id: computed.id,
    preset,
    placement: computed.placement,
    seriesIds,
  };
}

/**
 * Build a stacked pane config for an indicator (use when creating or extending stacks).
 */
export async function buildIndicatorPaneFromPreset(
  preset: IndicatorPresetName,
  x: Float32Array | Float64Array,
  prices: Float32Array | Float64Array,
  options: IndicatorPresetOptions &
    Pick<
      BuildIndicatorPaneOptions,
      "id" | "height" | "label" | "yRange" | "tickCount" | "showXAxis" | "seriesId" | "style"
    >,
  source?: import("../Series").Series,
): Promise<StackedPaneConfig> {
  const computed = await computeIndicatorPreset(preset, x, prices, options, source);
  return buildIndicatorPane({
    id: options.id ?? computed.id,
    height: options.height ?? 0.25,
    label: options.label ?? computed.id.toUpperCase(),
    yRange: options.yRange ?? computed.yRange ?? "auto",
    tickCount: options.tickCount,
    showXAxis: options.showXAxis,
    seriesId: options.seriesId,
    style: options.style,
    data: computed.data,
  });
}

// Re-export for convenience
export type { IndicatorPresetName, IndicatorPresetOptions, ComputedIndicatorPreset };
