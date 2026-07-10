import { describe, it, expect, vi } from "vitest";
import {
  useVeloPlotAngular,
  useStackedPlotAngular,
  useChartSyncAngular,
  useIndicatorAngular,
} from "./hooks";
import { buildMockChart } from "../bindings/test-utils";

const mockChart = buildMockChart();

vi.mock("../bindings/shared/chartLifecycle", () => ({
  createChartLifecycle: vi.fn(() => ({
    chart: mockChart,
    getBounds: () => mockChart.getViewBounds(),
    destroy: mockChart.destroy,
  })),
}));

vi.mock("../core/stacked", () => ({
  createStackedChart: vi.fn(() => ({
    destroy: vi.fn(),
    whenReady: () => Promise.resolve(),
  })),
}));

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    createChartSync: vi.fn(() => ({
      group: {},
      destroy: vi.fn(),
    })),
    addIndicatorToHost: vi.fn(async () => ({ id: "rsi", seriesIds: ["rsi"] })),
  };
});

describe("angular hooks", () => {
  it("useVeloPlotAngular mounts and destroys", () => {
    const host = useVeloPlotAngular();
    const el = document.createElement("div");
    host.mount(el);
    expect(host.chart).toBeTruthy();
    host.ngOnDestroy();
    expect(mockChart.destroy).toHaveBeenCalled();
  });

  it("useStackedPlotAngular returns stack handle", () => {
    const el = document.createElement("div");
    const { stack, destroy } = useStackedPlotAngular(el, {
      panes: [{ id: "p", height: 1, series: [] }],
    });
    expect(stack).toBeTruthy();
    destroy();
  });

  it("useChartSyncAngular skips single chart", () => {
    const { group } = useChartSyncAngular([
      {
        getId: () => "a",
        getViewBounds: () => ({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }),
        zoom: vi.fn(),
        pan: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      },
    ]);
    expect(group).toBeNull();
  });

  it("useChartSyncAngular syncs multiple charts", () => {
    const chart = () => ({
      getId: () => "a",
      getViewBounds: () => ({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }),
      zoom: vi.fn(),
      pan: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    });
    const { group, destroy } = useChartSyncAngular([chart(), chart()], { axis: "x" });
    expect(group).toBeTruthy();
    destroy();
  });

  it("useChartSyncAngular single-chart destroy is a no-op", () => {
    const { destroy } = useChartSyncAngular([
      {
        getId: () => "a",
        getViewBounds: () => ({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }),
        zoom: vi.fn(),
        pan: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      },
    ]);
    destroy();
  });

  it("useVeloPlotAngular remounts on second mount", () => {
    const host = useVeloPlotAngular();
    const el = document.createElement("div");
    host.mount(el);
    host.mount(el);
    expect(mockChart.destroy).toHaveBeenCalled();
    host.ngOnDestroy();
  });

  it("useVeloPlotAngular mounts without options", () => {
    const host = useVeloPlotAngular();
    host.mount(document.createElement("div"));
    expect(host.chart).toBeTruthy();
    host.ngOnDestroy();
  });

  it("useIndicatorAngular works without options", async () => {
    const result = await useIndicatorAngular(buildMockChart(), "ema");
    expect(result.id).toBe("rsi");
  });

  it("useIndicatorAngular passes options", async () => {
    const { addIndicatorToHost } = await import("../bindings/shared");
    const result = await useIndicatorAngular(buildMockChart(), "rsi", { period: 14 });
    expect(result.id).toBe("rsi");
    expect(addIndicatorToHost).toHaveBeenCalledWith(
      expect.anything(),
      "rsi",
      { period: 14 },
    );
  });
});
