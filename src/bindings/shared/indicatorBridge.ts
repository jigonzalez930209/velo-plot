/**
 * Indicator bridge for framework bindings.
 */

import type { Chart } from "../../core/chart/types";
import type { StackedChart } from "../../core/stacked/types";
import {
  addIndicatorToChart,
  type AddIndicatorOptions,
  type AddIndicatorResult,
} from "../../core/indicator/addIndicator";
import type { IndicatorPresetName } from "../../core/indicator/indicatorPresets";

export type IndicatorHost = Chart | StackedChart | null;

export function isStackedChart(host: IndicatorHost): host is StackedChart {
  return (
    host != null &&
    "getPanes" in host &&
    typeof (host as StackedChart).getPanes === "function"
  );
}

export async function addIndicatorToHost(
  host: IndicatorHost,
  preset: IndicatorPresetName,
  options: AddIndicatorOptions = {},
): Promise<AddIndicatorResult & { paneId?: string }> {
  if (!host) {
    throw new Error(
      "[useIndicator] Chart is not ready. Wait for isReady before adding indicators.",
    );
  }

  if (isStackedChart(host)) {
    const result = await host.addIndicator(preset, options);
    return result;
  }

  return addIndicatorToChart(host, preset, options);
}

export function removeIndicatorFromChart(
  chart: Chart,
  rootId: string,
): void {
  for (const s of [...chart.getAllSeries()]) {
    const sid = s.getId();
    if (sid === rootId || sid.startsWith(`${rootId}-`)) {
      chart.removeSeries(sid);
    }
  }
}
