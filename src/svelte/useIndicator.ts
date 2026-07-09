import { writable } from "svelte/store";
import type { AddIndicatorOptions, AddIndicatorResult } from "../core/indicator/addIndicator";
import type { IndicatorPresetName } from "../core/indicator/indicatorPresets";
import { addIndicatorToHost, isStackedChart, removeIndicatorFromChart, type IndicatorHost } from "../bindings/shared";
import type { Chart } from "../core/chart/types";

export function useIndicator(
  getHost: () => IndicatorHost,
  preset: IndicatorPresetName,
  options: AddIndicatorOptions = {},
) {
  const result = writable<(AddIndicatorResult & { paneId?: string }) | null>(null);
  const isLoading = writable(false);
  const error = writable<Error | null>(null);

  const run = async () => {
    const host = getHost();
    if (!host) return;
    isLoading.set(true);
    try {
      const res = await addIndicatorToHost(host, preset, options);
      result.set(res);
      isLoading.set(false);
    } catch (e) {
      error.set(e instanceof Error ? e : new Error(String(e)));
      isLoading.set(false);
    }
  };

  const cleanupIndicator = () => {
    const host = getHost();
    let currentId: string | null = null;
    const unsub = result.subscribe((r) => {
      currentId = r?.id ?? null;
    });
    unsub();
    if (currentId && host && !isStackedChart(host)) {
      removeIndicatorFromChart(host as Chart, currentId);
    }
  };

  return { result, isLoading, error, run, cleanup: cleanupIndicator };
}
