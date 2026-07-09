/**
 * Apply chart option changes without remounting.
 */

import type { Chart } from "../../core/chart/types";
import type { ChartOptions } from "../../types";

export type SyncableChartOptions = Omit<ChartOptions, "container">;

const SYNC_KEYS: (keyof SyncableChartOptions)[] = [
  "xAxis",
  "yAxis",
  "theme",
  "background",
  "showLegend",
  "layout",
  "responsive",
  "colorScheme",
  "showControls",
  "toolbar",
  "animations",
];

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => aObj[k] === bObj[k]);
}

export function optionsChanged(
  prev: SyncableChartOptions,
  next: SyncableChartOptions,
): boolean {
  return SYNC_KEYS.some((key) => !shallowEqual(prev[key], next[key]));
}

export function syncChartOptions(
  chart: Chart,
  prev: SyncableChartOptions,
  next: SyncableChartOptions,
): void {
  if (prev.xAxis !== next.xAxis && next.xAxis) {
    chart.updateXAxis(next.xAxis);
  }

  if (prev.yAxis !== next.yAxis && next.yAxis) {
    const axes = Array.isArray(next.yAxis) ? next.yAxis : [next.yAxis];
    axes.forEach((axis) => {
      if (axis.id) {
        chart.updateYAxis(axis.id, axis);
      }
    });
  }

  if (prev.theme !== next.theme && next.theme !== undefined) {
    chart.setTheme(next.theme);
  }

  if (prev.background !== next.background && next.background) {
    chart.setTheme({ backgroundColor: next.background } as object);
  }

  if (
    prev.showLegend !== next.showLegend &&
    next.showLegend !== undefined &&
    "setShowLegend" in chart &&
    typeof (chart as { setShowLegend?: (v: boolean) => void }).setShowLegend ===
      "function"
  ) {
    (chart as { setShowLegend: (v: boolean) => void }).setShowLegend(
      next.showLegend,
    );
  }

  if (prev.layout !== next.layout || prev.responsive !== next.responsive) {
    chart.resize();
  }
}

export function pickSyncableOptions(
  options: SyncableChartOptions,
): SyncableChartOptions {
  const picked: SyncableChartOptions = {};
  for (const key of SYNC_KEYS) {
    if (options[key] !== undefined) {
      (picked as Record<string, unknown>)[key] = options[key];
    }
  }
  return picked;
}
