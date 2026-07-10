import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { VeloPlot, StackedPlot } from "./VeloPlot";
import { buildMockChart } from "../bindings/test-utils";

const mockChart = buildMockChart();
const mockStack = {
  destroy: vi.fn(),
  whenReady: () => Promise.resolve(),
  container: document.createElement("div"),
  fitAll: vi.fn(),
  resetAll: vi.fn(),
};

vi.mock("../bindings/shared/chartLifecycle", () => ({
  createChartLifecycle: vi.fn(() => ({
    chart: mockChart,
    getBounds: () => mockChart.getViewBounds(),
    destroy: mockChart.destroy,
  })),
  pickSyncableOptions: (o: object) => o,
  optionsChanged: () => false,
  syncChartOptions: vi.fn(),
}));

vi.mock("../core/stacked", () => ({
  createStackedChart: vi.fn(() => mockStack),
}));

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    stackedStructureKey: () => "p",
    syncStackedPaneSeries: () => new Map(),
    syncStackedOptions: vi.fn(),
  };
});

describe("StackedPlot solid", () => {
  it("renders with numeric and string dimensions", () => {
    const { container, unmount } = render(() =>
      StackedPlot({
        panes: [{ id: "p", height: 1, series: [] }],
        width: 640,
        height: "300px",
        class: "stack-solid",
        theme: "dark",
      }),
    );
    expect(container.querySelector(".velo-plot-stacked.stack-solid")).toBeTruthy();
    unmount();
    expect(mockStack.destroy).toHaveBeenCalled();
  });

  it("uses default dimensions when omitted", () => {
    const { container } = render(() =>
      StackedPlot({ panes: [{ id: "p", height: 1, series: [] }] }),
    );
    const el = container.querySelector(".velo-plot-stacked") as HTMLElement;
    expect(el.style.width).toBe("100%");
    expect(el.style.height).toBe("480px");
  });
});

describe("VeloPlot solid ref callback", () => {
  it("ignores null container ref", () => {
    const { unmount } = render(() => VeloPlot({ series: [], width: "100%" }));
    unmount();
  });

  it("passes null through stacked ref callback", () => {
    const { unmount } = render(() =>
      StackedPlot({ panes: [{ id: "p", height: 1, series: [] }] }),
    );
    unmount();
  });
});
