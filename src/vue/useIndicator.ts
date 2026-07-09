import { ref, watch, onUnmounted } from "vue";
import type { AddIndicatorOptions, AddIndicatorResult } from "../core/indicator/addIndicator";
import type { IndicatorPresetName } from "../core/indicator/indicatorPresets";
import {
  addIndicatorToHost,
  isStackedChart,
  removeIndicatorFromChart,
  type IndicatorHost,
} from "../bindings/shared";
import type { Chart } from "../core/chart/types";

export function useIndicator(
  host: () => IndicatorHost,
  preset: IndicatorPresetName,
  options: AddIndicatorOptions = {},
) {
  const result = ref<(AddIndicatorResult & { paneId?: string }) | null>(null);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  watch(
    () => [host(), preset, JSON.stringify(options)] as const,
    async ([h], _, onCleanup) => {
      if (!h) return;
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
        const res = result.value;
        if (res && !isStackedChart(h)) {
          removeIndicatorFromChart(h as Chart, res.id);
        }
      });
      isLoading.value = true;
      error.value = null;
      try {
        const res = await addIndicatorToHost(h, preset, options);
        if (!cancelled) {
          result.value = res;
          isLoading.value = false;
        }
      } catch (e) {
        if (!cancelled) {
          error.value = e instanceof Error ? e : new Error(String(e));
          isLoading.value = false;
        }
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    const h = host();
    const res = result.value;
    if (res && h && !isStackedChart(h)) {
      removeIndicatorFromChart(h as Chart, res.id);
    }
  });

  return { result, isLoading, error };
}
