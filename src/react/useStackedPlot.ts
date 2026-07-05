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

export interface UseStackedPlotOptions extends Omit<StackedChartOptions, "container"> {}

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
  const [stack, setStack] = useState<StackedChart | null>(null);
  const [isReady, setIsReady] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const created = createStackedChart({
      ...optionsRef.current,
      container: el,
    });
    stackRef.current = created;
    setStack(created);

    created.whenReady().then(() => setIsReady(true));

    return () => {
      setIsReady(false);
      created.destroy();
      stackRef.current = null;
      setStack(null);
    };
  }, []);

  const fitAll = useCallback((opts?: { x?: Range; padding?: number }) => {
    stackRef.current?.fitAll(opts);
  }, []);

  const resetAll = useCallback(() => {
    stackRef.current?.resetAll();
  }, []);

  return { containerRef, stack, isReady, fitAll, resetAll };
}
