/**
 * useChartSync - React hook for synchronizing multiple charts
 */

import { useEffect, useState } from "react";
import type { ChartLike, SyncOptions } from "../core/sync";
import { ChartGroup } from "../core/sync";
import { createChartSync } from "../bindings/shared";

export interface UseChartSyncReturn {
  group: ChartGroup | null;
}

export function useChartSync(
  charts: ChartLike[],
  options?: SyncOptions,
): UseChartSyncReturn {
  const [group, setGroup] = useState<ChartGroup | null>(null);

  useEffect(() => {
    if (charts.length < 2) {
      setGroup(null);
      return;
    }

    const handle = createChartSync(charts, options);
    setGroup(handle.group);

    return () => {
      handle.destroy();
      setGroup(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charts, JSON.stringify(options)]);

  return { group };
}

/** Alias matching roadmap naming */
export const useChartGroup = useChartSync;
