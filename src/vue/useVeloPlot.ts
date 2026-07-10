/**
 * Vue composable for single charts.
 */

import { ref, shallowRef, onMounted, onUnmounted, watch } from "vue";
import type { Ref } from "vue";
import type { Chart } from "../core/Chart";
import type {
  SeriesOptions,
  SeriesUpdateData,
  ZoomOptions,
  Bounds,
} from "../types";
import {
  createChartLifecycle,
  type ChartBindingOptions,
  optionsChanged,
  syncChartOptions,
  pickSyncableOptions,
} from "../bindings/shared";

export interface UseVeloPlotOptions extends ChartBindingOptions {}

export interface UseVeloPlotReturn {
  containerRef: Ref<HTMLDivElement | null>;
  chart: Ref<Chart | null>;
  isReady: Ref<boolean>;
  error: Ref<Error | null>;
  bounds: Ref<Bounds | null>;
  addSeries: (options: SeriesOptions) => void;
  updateSeries: (id: string, data: SeriesUpdateData) => void;
  removeSeries: (id: string) => void;
  zoom: (options: ZoomOptions) => void;
  resetZoom: () => void;
}

export function useVeloPlot(options: UseVeloPlotOptions = {}): UseVeloPlotReturn {
  const containerRef = ref<HTMLDivElement | null>(null);
  const chart = shallowRef<Chart | null>(null);
  const isReady = ref(false);
  const error = ref<Error | null>(null);
  const bounds = ref<Bounds | null>(null);

  let destroy: (() => void) | null = null;
  const optionsRef = { current: options };
  let prevSync = pickSyncableOptions(options);

  watch(
    () => options,
    (next) => {
      optionsRef.current = next;
      const c = chart.value;
      if (!c) return;
      const picked = pickSyncableOptions(next);
      if (optionsChanged(prevSync, picked)) {
        syncChartOptions(c, prevSync, picked);
        prevSync = picked;
      }
    },
    { deep: true },
  );

  onMounted(() => {
    const el = containerRef.value;
    if (!el) return;
    try {
      const handle = createChartLifecycle(el, optionsRef.current, {
        onBoundsChange: (b) => {
          bounds.value = b;
        },
        onError: (e) => {
          error.value = e;
        },
      });
      chart.value = handle.chart;
      destroy = handle.destroy;
      bounds.value = handle.getBounds();
      isReady.value = true;
      prevSync = pickSyncableOptions(optionsRef.current);
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
    }
  });

  onUnmounted(() => {
    destroy?.();
    destroy = null;
    chart.value = null;
    isReady.value = false;
  });

  const addSeries = (opts: SeriesOptions) => {
    chart.value?.addSeries(opts);
    if (chart.value) bounds.value = chart.value.getViewBounds();
  };

  return {
    containerRef,
    chart,
    isReady,
    error,
    bounds,
    addSeries,
    updateSeries: (id, data) => chart.value?.updateSeries(id, data),
    removeSeries: (id) => chart.value?.removeSeries(id),
    zoom: (z) => chart.value?.zoom(z),
    resetZoom: () => {
      chart.value?.resetZoom();
      if (chart.value) bounds.value = chart.value.getViewBounds();
    },
  };
}
