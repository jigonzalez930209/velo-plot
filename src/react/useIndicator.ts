/**
 * useIndicator - React hook for trading indicators
 */

import { useEffect, useRef, useState } from "react";
import type { Chart } from "../core/chart/types";
import type { AddIndicatorOptions, AddIndicatorResult } from "../core/indicator/addIndicator";
import type { IndicatorPresetName } from "../core/indicator/indicatorPresets";
import {
  addIndicatorToHost,
  isStackedChart,
  removeIndicatorFromChart,
  type IndicatorHost,
} from "../bindings/shared";

export interface UseIndicatorReturn {
  result: (AddIndicatorResult & { paneId?: string }) | null;
  isLoading: boolean;
  error: Error | null;
}

export function useIndicator(
  host: IndicatorHost,
  preset: IndicatorPresetName,
  options: AddIndicatorOptions = {},
): UseIndicatorReturn {
  const [result, setResult] = useState<
    (AddIndicatorResult & { paneId?: string }) | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const resultRef = useRef(result);
  resultRef.current = result;

  useEffect(() => {
    if (!host) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    addIndicatorToHost(host, preset, options)
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      const res = resultRef.current;
      if (res && !isStackedChart(host)) {
        removeIndicatorFromChart(host as Chart, res.id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, preset, JSON.stringify(options)]);

  return { result, isLoading, error };
}
