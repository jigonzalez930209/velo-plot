import { writable } from "svelte/store";
import type { ChartLike, SyncOptions } from "../core/sync";
import { ChartGroup } from "../core/sync";
import { createChartSync } from "../bindings/shared";

export function useChartSync(getCharts: () => ChartLike[], options?: SyncOptions) {
  const group = writable<ChartGroup | null>(null);
  let handle: ReturnType<typeof createChartSync> | null = null;

  const sync = () => {
    handle?.destroy();
    const charts = getCharts();
    if (charts.length < 2) {
      group.set(null);
      return;
    }
    handle = createChartSync(charts, options);
    group.set(handle.group);
  };

  const destroy = () => {
    handle?.destroy();
    group.set(null);
  };

  return { group, sync, destroy };
}

export const useChartGroup = useChartSync;
