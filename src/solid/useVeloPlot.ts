import { createSignal, onCleanup, createEffect } from "solid-js";
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

export function useVeloPlot(options: () => UseVeloPlotOptions = () => ({})) {
  const [chart, setChart] = createSignal<Chart | null>(null);
  const [isReady, setIsReady] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);
  const [bounds, setBounds] = createSignal<Bounds | null>(null);
  let container: HTMLDivElement | undefined;
  let destroy: (() => void) | null = null;
  let prevSync = pickSyncableOptions(options());

  const mount = (el: HTMLDivElement) => {
    container = el;
    destroy?.();
    const handle = createChartLifecycle(el, options(), {
      onBoundsChange: setBounds,
      onError: setError,
    });
    setChart(handle.chart);
    destroy = handle.destroy;
    setBounds(handle.getBounds());
    setIsReady(true);
    prevSync = pickSyncableOptions(options());
  };

  onCleanup(() => {
    destroy?.();
    setChart(null);
    setIsReady(false);
  });

  createEffect(() => {
    const c = chart();
    const opts = options();
    if (!c) return;
    const next = pickSyncableOptions(opts);
    if (optionsChanged(prevSync, next)) {
      syncChartOptions(c, prevSync, next);
      prevSync = next;
    }
  });

  return {
    setContainerRef: (el: HTMLDivElement | null | undefined) => {
      if (el && el !== container) mount(el);
    },
    chart,
    isReady,
    error,
    bounds,
    addSeries: (opts: SeriesOptions) => {
      chart()?.addSeries(opts);
      const c = chart();
      if (c) setBounds(c.getViewBounds());
    },
    updateSeries: (id: string, data: SeriesUpdateData) => chart()?.updateSeries(id, data),
    removeSeries: (id: string) => chart()?.removeSeries(id),
    zoom: (z: ZoomOptions) => chart()?.zoom(z),
    resetZoom: () => {
      chart()?.resetZoom();
      const c = chart();
      if (c) setBounds(c.getViewBounds());
    },
  };
}
