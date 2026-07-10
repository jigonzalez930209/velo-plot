import { ref, watch, onUnmounted } from "vue";
import type { ChartLike, SyncOptions } from "../core/sync";
import { ChartGroup } from "../core/sync";
import { createChartSync } from "../bindings/shared";

export function useChartSync(
  charts: () => ChartLike[],
  options?: SyncOptions,
) {
  const group = ref<ChartGroup | null>(null);
  let handle: ReturnType<typeof createChartSync> | null = null;

  watch(
    () => [charts(), JSON.stringify(options)] as const,
    ([list]) => {
      handle?.destroy();
      if (list.length < 2) {
        group.value = null;
        return;
      }
      handle = createChartSync(list, options);
      group.value = handle.group;
    },
    { immediate: true },
  );

  onUnmounted(() => {
    handle?.destroy();
    group.value = null;
  });

  return { group };
}

export const useChartGroup = useChartSync;
