/**
 * Svelte composables for velo-plot (exported as functions).
 */

import { writable, get } from "svelte/store";
import type { Chart } from "../core/Chart";
import type { SeriesOptions, SeriesUpdateData, ZoomOptions, Bounds } from "../types";
import {
  createChartLifecycle,
  type ChartBindingOptions,
  optionsChanged,
  syncChartOptions,
  pickSyncableOptions,
} from "../bindings/shared";

export interface UseVeloPlotOptions extends ChartBindingOptions {}

export function createVeloPlot(options: UseVeloPlotOptions = {}) {
  const chart = writable<Chart | null>(null);
  const isReady = writable(false);
  const error = writable<Error | null>(null);
  const bounds = writable<Bounds | null>(null);

  let destroy: (() => void) | null = null;
  let prevSync = pickSyncableOptions(options);

  const mount = (container: HTMLDivElement) => {
    destroy?.();
    const handle = createChartLifecycle(container, options, {
      onBoundsChange: (b) => bounds.set(b),
      onError: (e) => error.set(e),
    });
    chart.set(handle.chart);
    destroy = handle.destroy;
    bounds.set(handle.getBounds());
    isReady.set(true);
    prevSync = pickSyncableOptions(options);
  };

  const updateOptions = (next: UseVeloPlotOptions) => {
    const c = get(chart);
    if (!c) return;
    const picked = pickSyncableOptions(next);
    if (optionsChanged(prevSync, picked)) {
      syncChartOptions(c, prevSync, picked);
      prevSync = picked;
    }
  };

  const unmount = () => {
    destroy?.();
    destroy = null;
    chart.set(null);
    isReady.set(false);
  };

  return {
    chart,
    isReady,
    error,
    bounds,
    mount,
    unmount,
    updateOptions,
    addSeries: (opts: SeriesOptions) => {
      get(chart)?.addSeries(opts);
      const c = get(chart);
      if (c) bounds.set(c.getViewBounds());
    },
    updateSeries: (id: string, data: SeriesUpdateData) => get(chart)?.updateSeries(id, data),
    removeSeries: (id: string) => get(chart)?.removeSeries(id),
    zoom: (z: ZoomOptions) => get(chart)?.zoom(z),
    resetZoom: () => {
      get(chart)?.resetZoom();
      const c = get(chart);
      if (c) bounds.set(c.getViewBounds());
    },
  };
}

export { createVeloPlot as useVeloPlot };
