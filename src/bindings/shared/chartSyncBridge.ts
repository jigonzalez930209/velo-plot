/**
 * Chart sync bridge for framework bindings.
 */

import {
  ChartGroup,
  createChartGroup,
  type ChartLike,
  type SyncOptions,
} from "../../core/sync";

export interface ChartSyncHandle {
  group: ChartGroup;
  destroy: () => void;
}

export function createChartSync(
  charts: ChartLike[],
  options?: SyncOptions,
): ChartSyncHandle {
  const group = createChartGroup(charts, options);
  return {
    group,
    destroy: () => group.destroy(),
  };
}

export function updateChartSync(
  handle: ChartSyncHandle | null,
  charts: ChartLike[],
  options?: SyncOptions,
): ChartSyncHandle {
  handle?.destroy();
  if (charts.length < 2) {
    return { group: new ChartGroup(options), destroy: () => {} };
  }
  return createChartSync(charts, options);
}
