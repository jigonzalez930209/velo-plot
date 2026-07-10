/**
 * Stacked chart option sync without full remount when possible.
 */

import type { StackedChart, StackedChartOptions } from "../../core/stacked/types";
import type { StackedPaneConfig } from "../../core/stacked/types";
import { diffSeries } from "./seriesDiff";
import type { VeloPlotSeries } from "./types";
import { veloPlotSeriesToOptions } from "./seriesDiff";

export type SyncableStackedOptions = Omit<StackedChartOptions, "container">;

export function stackedStructureKey(panes: StackedPaneConfig[]): string {
  return panes
    .map(
      (p) =>
        `${p.id}:${p.height}:${p.showXAxis ?? ""}:${p.showYAxis ?? ""}`,
    )
    .join("|");
}

export function syncStackedTheme(
  stack: StackedChart,
  theme: StackedChartOptions["theme"],
): void {
  if (theme === undefined) return;
  for (const pane of stack.getPanes()) {
    pane.setTheme(theme);
  }
}

export function syncStackedSyncOptions(
  stack: StackedChart,
  sync: StackedChartOptions["sync"],
): void {
  if (sync === false) {
    stack.setSyncAxis("none");
    return;
  }
  if (sync === true || sync === undefined) return;
  stack.setSyncOptions(sync);
}

export function syncStackedPaneSeries(
  stack: StackedChart,
  panes: StackedPaneConfig[],
  previousSeries: Map<string, Map<string, VeloPlotSeries>>,
): Map<string, Map<string, VeloPlotSeries>> {
  const next = new Map<string, Map<string, VeloPlotSeries>>();

  for (const pane of panes) {
    const chart = stack.getPane(pane.id);
    if (!chart || !pane.series?.length) {
      next.set(pane.id, new Map());
      continue;
    }

    const asVeloPlot: VeloPlotSeries[] = pane.series.map((s) => {
      if (s.type === "candlestick" && s.data) {
        return {
          id: s.id,
          type: "candlestick" as const,
          x: s.data.x,
          open: s.data.open!,
          high: s.data.high!,
          low: s.data.low!,
          close: s.data.close!,
          color: s.style?.color,
          width: s.style?.width,
          visible: s.visible,
          name: s.name,
        };
      }
      if (s.type === "bar" && s.data) {
        return {
          id: s.id,
          type: "bar" as const,
          x: s.data.x,
          y: s.data.y,
          color: s.style?.color,
          width: s.style?.width,
          visible: s.visible,
          name: s.name,
        };
      }
      if (s.type === "heatmap" && s.data) {
        const hd = s.data as unknown as import("../../types").HeatmapData;
        return {
          id: s.id,
          type: "heatmap" as const,
          data: {
            xValues: hd.xValues,
            yValues: hd.yValues,
            zValues: hd.zValues,
          },
          color: s.style?.color,
          visible: s.visible,
          name: s.name,
        };
      }
      return {
        id: s.id,
        type: "line" as const,
        x: s.data.x,
        y: s.data.y,
        color: s.style?.color,
        width: s.style?.width,
        visible: s.visible,
        name: s.name,
      };
    });

    const prev = previousSeries.get(pane.id) ?? new Map();
    const actions = {
      addSeries: (opts: Parameters<typeof chart.addSeries>[0]) =>
        chart.addSeries(opts),
      updateSeries: (id: string, data: Parameters<typeof chart.updateSeries>[1]) =>
        chart.updateSeries(id, data),
      removeSeries: (id: string) => chart.removeSeries(id),
      autoScale: () => chart.autoScale(),
    };
    next.set(pane.id, diffSeries(actions, asVeloPlot, prev));

    // Also handle initial series from StackedPaneConfig on first mount
    if (prev.size === 0 && pane.series.length > 0) {
      for (const s of pane.series) {
        if (!chart.getAllSeries().some((existing) => existing.getId() === s.id)) {
          chart.addSeries(veloPlotSeriesToOptions(asVeloPlot.find((x) => x.id === s.id)!));
        }
      }
    }
  }

  return next;
}

export function syncStackedOptions(
  stack: StackedChart,
  options: SyncableStackedOptions,
): void {
  syncStackedTheme(stack, options.theme);
  syncStackedSyncOptions(stack, options.sync);
  if (options.gap !== undefined) {
    stack.resize();
  }
}
