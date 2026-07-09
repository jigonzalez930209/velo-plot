/**
 * useVeloPlot - React hook for Velo Plot
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
} from "react";
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
  chart: Chart | null;
  isReady: boolean;
  error: Error | null;
  bounds: Bounds | null;
  addSeries: (options: SeriesOptions) => void;
  updateSeries: (id: string, data: SeriesUpdateData) => void;
  removeSeries: (id: string) => void;
  zoom: (options: ZoomOptions) => void;
  resetZoom: () => void;
}

export function useVeloPlot(
  containerRef: RefObject<HTMLDivElement | null>,
  options: UseVeloPlotOptions = {},
): UseVeloPlotReturn {
  const [chart, setChart] = useState<Chart | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);

  const chartRef = useRef<Chart | null>(null);
  const destroyRef = useRef<(() => void) | null>(null);
  const optionsRef = useRef(options);
  const prevSyncOptionsRef = useRef(pickSyncableOptions(options));
  optionsRef.current = options;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      const handle = createChartLifecycle(
        container,
        optionsRef.current,
        {
          onBoundsChange: setBounds,
          onError: setError,
        },
      );
      chartRef.current = handle.chart;
      destroyRef.current = handle.destroy;
      setChart(handle.chart);
      setIsReady(true);
      setBounds(handle.getBounds());
      setError(null);
      prevSyncOptionsRef.current = pickSyncableOptions(optionsRef.current);
    } catch (err) {
      console.error("[useVeloPlot] Failed to initialize chart:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsReady(false);
    }

    return () => {
      destroyRef.current?.();
      destroyRef.current = null;
      chartRef.current = null;
      setChart(null);
      setIsReady(false);
    };
  }, [containerRef]);

  useEffect(() => {
    const currentChart = chartRef.current;
    if (!currentChart || !isReady) return;

    const next = pickSyncableOptions(options);
    const prev = prevSyncOptionsRef.current;
    if (optionsChanged(prev, next)) {
      syncChartOptions(currentChart, prev, next);
      prevSyncOptionsRef.current = next;
    }
  });

  const addSeries = useCallback((seriesOptions: SeriesOptions) => {
    const c = chartRef.current;
    if (c) {
      c.addSeries(seriesOptions);
      setBounds(c.getViewBounds());
    }
  }, []);

  const updateSeries = useCallback((id: string, data: SeriesUpdateData) => {
    chartRef.current?.updateSeries(id, data);
  }, []);

  const removeSeries = useCallback((id: string) => {
    chartRef.current?.removeSeries(id);
  }, []);

  const zoom = useCallback((zoomOptions: ZoomOptions) => {
    chartRef.current?.zoom(zoomOptions);
  }, []);

  const resetZoom = useCallback(() => {
    const c = chartRef.current;
    if (c) {
      c.resetZoom();
      setBounds(c.getViewBounds());
    }
  }, []);

  return {
    chart,
    isReady,
    error,
    bounds,
    addSeries,
    updateSeries,
    removeSeries,
    zoom,
    resetZoom,
  };
}
