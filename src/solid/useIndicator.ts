import { createSignal, createEffect, onCleanup } from "solid-js";
import type { AddIndicatorOptions, AddIndicatorResult } from "../core/indicator/addIndicator";
import type { IndicatorPresetName } from "../core/indicator/indicatorPresets";
import { addIndicatorToHost, isStackedChart, removeIndicatorFromChart, type IndicatorHost } from "../bindings/shared";
import type { Chart } from "../core/chart/types";

export function useIndicator(
  host: () => IndicatorHost,
  preset: IndicatorPresetName,
  options: AddIndicatorOptions = {},
) {
  const [result, setResult] = createSignal<(AddIndicatorResult & { paneId?: string }) | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);

  createEffect(() => {
    const h = host();
    if (!h) return;
    let cancelled = false;
    setIsLoading(true);
    addIndicatorToHost(h, preset, options)
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setIsLoading(false);
        }
      });
    onCleanup(() => {
      cancelled = true;
      const res = result();
      if (res && !isStackedChart(h)) removeIndicatorFromChart(h as Chart, res.id);
    });
  });

  return { result, isLoading, error };
}
