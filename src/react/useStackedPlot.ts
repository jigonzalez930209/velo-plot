/**
 * useStackedPlot - React hook for multi-pane stacked charts
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
} from "react";
import { createStackedChart } from "../core/stacked";
import type { StackedChart, StackedChartOptions } from "../core/stacked";
import type { Range } from "../types";
import {
  stackedStructureKey,
  syncStackedOptions,
  syncStackedPaneSeries,
} from "../bindings/shared";
import type { VeloPlotSeries } from "../bindings/shared";

export interface UseStackedPlotOptions
  extends Omit<StackedChartOptions, "container"> {}

export interface UseStackedPlotReturn {
  containerRef: RefObject<HTMLDivElement>;
  stack: StackedChart | null;
  isReady: boolean;
  fitAll: (options?: { x?: Range; padding?: number }) => void;
  resetAll: () => void;
}

export function useStackedPlot(
  options: UseStackedPlotOptions,
): UseStackedPlotReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<StackedChart | null>(null);
  const destroyRef = useRef<(() => void) | null>(null);
  const [stack, setStack] = useState<StackedChart | null>(null);
  const [isReady, setIsReady] = useState(false);

  const optionsRef = useRef(options);
  const structureKeyRef = useRef(stackedStructureKey(options.panes));
  const paneSeriesRef = useRef(new Map<string, Map<string, VeloPlotSeries>>());
  optionsRef.current = options;

  const mountStack = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    destroyRef.current?.();
    const created = createStackedChart({
      ...optionsRef.current,
      container: el,
    });
    stackRef.current = created;
    destroyRef.current = () => {
      created.destroy();
      stackRef.current = null;
    };
    setStack(created);
    structureKeyRef.current = stackedStructureKey(optionsRef.current.panes);
    paneSeriesRef.current = syncStackedPaneSeries(
      created,
      optionsRef.current.panes,
      new Map(),
    );

    created.whenReady().then(() => setIsReady(true));
  }, []);

  useEffect(() => {
    mountStack();
    return () => {
      setIsReady(false);
      destroyRef.current?.();
      destroyRef.current = null;
      setStack(null);
    };
  }, [mountStack]);

  useEffect(() => {
    const current = stackRef.current;
    if (!current || !isReady) return;

    const nextKey = stackedStructureKey(options.panes);
    if (nextKey !== structureKeyRef.current) {
      mountStack();
      return;
    }

    syncStackedOptions(current, options);
    paneSeriesRef.current = syncStackedPaneSeries(
      current,
      options.panes,
      paneSeriesRef.current,
    );
  });

  const fitAll = useCallback((opts?: { x?: Range; padding?: number }) => {
    stackRef.current?.fitAll(opts);
  }, []);

  const resetAll = useCallback(() => {
    stackRef.current?.resetAll();
  }, []);

  return { containerRef, stack, isReady, fitAll, resetAll };
}
