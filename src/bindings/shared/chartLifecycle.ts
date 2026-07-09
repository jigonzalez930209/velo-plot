/**
 * Framework-agnostic chart lifecycle helpers.
 */

import { createChart, type Chart } from "../../core/Chart";
import type { ChartOptions, Bounds } from "../../types";
import type { BindingChartOptions } from "./types";

export type ChartBindingOptions = Omit<ChartOptions, "container"> &
  BindingChartOptions;

export interface ChartLifecycleHandle {
  chart: Chart;
  destroy: () => void;
  getBounds: () => Bounds | null;
}

export interface ChartLifecycleCallbacks {
  onBoundsChange?: (bounds: Bounds) => void;
  onError?: (error: Error) => void;
}

function defaultResponsive(
  options: ChartBindingOptions,
): ChartBindingOptions {
  const responsive = options.responsive ?? { reducedMotion: "auto" as const };
  return { ...options, responsive };
}

export function createChartLifecycle(
  container: HTMLDivElement,
  options: ChartBindingOptions,
  callbacks: ChartLifecycleCallbacks = {},
): ChartLifecycleHandle {
  const chart = createChart({
    ...defaultResponsive(options),
    container,
  });

  const onZoom = () => {
    callbacks.onBoundsChange?.(chart.getViewBounds());
  };
  chart.on("zoom", onZoom);

  let resizeObserver: ResizeObserver | undefined;
  if (options.autoResize !== false) {
    resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(container);
  }

  return {
    chart,
    getBounds: () => chart.getViewBounds(),
    destroy: () => {
      resizeObserver?.disconnect();
      chart.off("zoom", onZoom);
      chart.destroy();
    },
  };
}

export function attachZoomListener(
  chart: Chart,
  onBoundsChange: (bounds: Bounds) => void,
): () => void {
  const handler = () => onBoundsChange(chart.getViewBounds());
  chart.on("zoom", handler);
  return () => chart.off("zoom", handler);
}
