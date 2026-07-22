/**
 * Framework-agnostic chart lifecycle helpers.
 */

import { createChart, type Chart } from "../../core/Chart";
import { createStackedChart } from "../../core/stacked";
import type {
  StackedChart,
  StackedChartOptions,
} from "../../core/stacked/types";
import type { ChartOptions, Bounds } from "../../types";
import type { BindingChartOptions } from "./types";
import { registerScientificBundle } from "../../scientific/registerScientific";
import { registerTradingBundle } from "../../trading/registerTrading";

// Framework bindings (React/Vue/Svelte/Solid/Angular) create charts through the
// raw core factories. Because the package is marked `sideEffects: false`, a
// bundler is free to drop the side-effect-only registration imports of the
// scientific/trading bundles when a consumer only pulls a hook (e.g.
// `useStackedPlot`). Invoking the (idempotent) registration on the exact code
// path the bindings use guarantees extended series — candlestick, bar, heatmap,
// … — and SVG export are available regardless of how the app's bundler
// tree-shakes. This mirrors the `createChart`/`createStackedChart` wrappers in
// the top-level, trading and scientific entry points.
function registerExtendedBundles(): void {
  registerScientificBundle();
  registerTradingBundle();
}

/** Create a stacked chart with extended series registered (binding-safe). */
export function createRegisteredStackedChart(
  options: StackedChartOptions,
): StackedChart {
  registerExtendedBundles();
  return createStackedChart(options);
}

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
  registerExtendedBundles();
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
