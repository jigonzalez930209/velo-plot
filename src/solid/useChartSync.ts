import { createSignal, createEffect, onCleanup } from "solid-js";
import type { ChartLike, SyncOptions } from "../core/sync";
import { ChartGroup } from "../core/sync";
import { createChartSync } from "../bindings/shared";

export function useChartSync(charts: () => ChartLike[], options?: SyncOptions) {
  const [group, setGroup] = createSignal<ChartGroup | null>(null);

  createEffect(() => {
    const list = charts();
    let handle: ReturnType<typeof createChartSync> | null = null;
    if (list.length >= 2) {
      handle = createChartSync(list, options);
      setGroup(handle.group);
    } else {
      setGroup(null);
    }
    onCleanup(() => handle?.destroy());
  });

  return { group };
}

export const useChartGroup = useChartSync;
