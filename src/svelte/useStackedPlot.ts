import { writable, get } from "svelte/store";
import { createStackedChart } from "../core/stacked";
import type { StackedChart, StackedChartOptions } from "../core/stacked";
import type { Range } from "../types";
import { stackedStructureKey, syncStackedOptions, syncStackedPaneSeries } from "../bindings/shared";
import type { VeloPlotSeries } from "../bindings/shared";

export function createStackedPlot(options: Omit<StackedChartOptions, "container">) {
  const stack = writable<StackedChart | null>(null);
  const isReady = writable(false);
  let destroy: (() => void) | null = null;
  let structureKey = stackedStructureKey(options.panes);
  let paneSeries = new Map<string, Map<string, VeloPlotSeries>>();

  const mount = (container: HTMLDivElement) => {
    destroy?.();
    const created = createStackedChart({ ...options, container });
    stack.set(created);
    destroy = () => created.destroy();
    structureKey = stackedStructureKey(options.panes);
    paneSeries = syncStackedPaneSeries(created, options.panes, new Map());
    created.whenReady().then(() => isReady.set(true));
  };

  const sync = (next: Omit<StackedChartOptions, "container">) => {
    const s = get(stack);
    if (!s || !get(isReady)) return;
    const nextKey = stackedStructureKey(next.panes);
    if (nextKey !== structureKey) {
      mount(s.container);
      return;
    }
    syncStackedOptions(s, next);
    paneSeries = syncStackedPaneSeries(s, next.panes, paneSeries);
  };

  const unmount = () => {
    destroy?.();
    stack.set(null);
    isReady.set(false);
  };

  return {
    stack,
    isReady,
    mount,
    unmount,
    sync,
    fitAll: (opts?: { x?: Range; padding?: number }) => get(stack)?.fitAll(opts),
    resetAll: () => get(stack)?.resetAll(),
  };
}

export { createStackedPlot as useStackedPlot };
