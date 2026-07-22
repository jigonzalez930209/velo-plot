import { createSignal, onCleanup } from "solid-js";
import type { StackedChart, StackedChartOptions } from "../core/stacked";
import type { Range } from "../types";
import { createRegisteredStackedChart, stackedStructureKey, syncStackedOptions, syncStackedPaneSeries } from "../bindings/shared";
import type { VeloPlotSeries } from "../bindings/shared";

export function useStackedPlot(getOptions: () => Omit<StackedChartOptions, "container">) {
  const [stack, setStack] = createSignal<StackedChart | null>(null);
  const [isReady, setIsReady] = createSignal(false);
  let destroy: (() => void) | null = null;
  let structureKey = "";
  let paneSeries = new Map<string, Map<string, VeloPlotSeries>>();

  const mount = (el: HTMLDivElement) => {
    destroy?.();
    const opts = getOptions();
    const created = createRegisteredStackedChart({ ...opts, container: el });
    setStack(created);
    destroy = () => created.destroy();
    structureKey = stackedStructureKey(opts.panes);
    paneSeries = syncStackedPaneSeries(created, opts.panes, new Map());
    created.whenReady().then(() => setIsReady(true));
  };

  const setContainerRef = (el: HTMLDivElement | null | undefined) => {
    if (el) mount(el);
  };

  onCleanup(() => {
    destroy?.();
    setStack(null);
    setIsReady(false);
  });

  return {
    setContainerRef,
    stack,
    isReady,
    fitAll: (opts?: { x?: Range; padding?: number }) => stack()?.fitAll(opts),
    resetAll: () => stack()?.resetAll(),
    sync: () => {
      const s = stack();
      const opts = getOptions();
      if (!s || !isReady()) return;
      const nextKey = stackedStructureKey(opts.panes);
      if (nextKey !== structureKey) {
        mount(s.container);
        return;
      }
      syncStackedOptions(s, opts);
      paneSeries = syncStackedPaneSeries(s, opts.panes, paneSeries);
    },
  };
}
