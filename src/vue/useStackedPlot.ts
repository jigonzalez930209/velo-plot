/**
 * Vue composable for stacked charts.
 */

import { ref, shallowRef, onMounted, onUnmounted, watch } from "vue";
import type { StackedChart, StackedChartOptions } from "../core/stacked";
import type { Range } from "../types";
import {
  createRegisteredStackedChart,
  stackedStructureKey,
  syncStackedOptions,
  syncStackedPaneSeries,
} from "../bindings/shared";
import type { VeloPlotSeries } from "../bindings/shared";

export interface UseStackedPlotOptions
  extends Omit<StackedChartOptions, "container"> {}

export function useStackedPlot(options: UseStackedPlotOptions) {
  const containerRef = ref<HTMLDivElement | null>(null);
  const stack = shallowRef<StackedChart | null>(null);
  const isReady = ref(false);

  let destroy: (() => void) | null = null;
  let structureKey = stackedStructureKey(options.panes);
  let paneSeries = new Map<string, Map<string, VeloPlotSeries>>();

  const mount = () => {
    const el = containerRef.value;
    if (!el) return;
    destroy?.();
    const created = createRegisteredStackedChart({ ...options, container: el });
    stack.value = created;
    destroy = () => created.destroy();
    structureKey = stackedStructureKey(options.panes);
    paneSeries = syncStackedPaneSeries(created, options.panes, new Map());
    created.whenReady().then(() => {
      isReady.value = true;
    });
  };

  onMounted(mount);
  onUnmounted(() => {
    destroy?.();
    stack.value = null;
    isReady.value = false;
  });

  watch(
    () => options,
    (next) => {
      const current = stack.value;
      if (!current || !isReady.value) return;
      const nextKey = stackedStructureKey(next.panes);
      if (nextKey !== structureKey) {
        mount();
        return;
      }
      syncStackedOptions(current, next);
      paneSeries = syncStackedPaneSeries(current, next.panes, paneSeries);
    },
    { deep: true },
  );

  return {
    containerRef,
    stack,
    isReady,
    fitAll: (opts?: { x?: Range; padding?: number }) => stack.value?.fitAll(opts),
    resetAll: () => stack.value?.resetAll(),
  };
}
