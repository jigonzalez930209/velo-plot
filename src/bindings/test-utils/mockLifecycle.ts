import { vi } from "vitest";
import { buildMockChart } from "./index";

export function createMockChartLifecycle() {
  const chart = buildMockChart();
  const destroy = vi.fn();
  return {
    chart,
    destroy,
    handle: {
      chart,
      getBounds: () => chart.getViewBounds(),
      destroy,
    },
  };
}

export function mockChartLifecycleModule() {
  const lifecycle = createMockChartLifecycle();
  return {
    createChartLifecycle: vi.fn(() => lifecycle.handle),
    pickSyncableOptions: (o: object) => o,
    optionsChanged: () => false,
    syncChartOptions: vi.fn(),
    lifecycle,
  };
}
