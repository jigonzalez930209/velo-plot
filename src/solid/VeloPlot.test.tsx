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

describe("VeloPlot solid", () => {
  it("renders container and syncs series", () => {
    const { container } = render(() =>
      VeloPlot({
        series: [{ id: "a", x: new Float32Array([0]), y: new Float32Array([0]) }],
        height: 300,
        width: 500,
        class: "custom",
      }),
    );
    expect(container.querySelector(".velo-plot-container.custom")).toBeTruthy();
  });

  it("renders without an explicit series prop", () => {
    const { unmount } = render(() => VeloPlot({ height: 200 }));
    unmount();
  });

  it("renders StackedPlot with default dimensions", () => {
    const { container, unmount } = render(() =>
      StackedPlot({ panes: [{ id: "p", height: 1, series: [] }] }),
    );
    const el = container.querySelector(".velo-plot-stacked") as HTMLElement;
    expect(el.style.width).toBe("100%");
    expect(el.style.height).toBe("480px");
    unmount();
  });

  it("renders StackedPlot with numeric height", () => {
    const { container, unmount } = render(() =>
      StackedPlot({
        panes: [{ id: "p", height: 1, series: [] }],
        width: 600,
        height: 300,
      }),
    );
    const el = container.querySelector(".velo-plot-stacked") as HTMLElement;
    expect(el.style.height).toBe("300px");
    expect(el.style.width).toBe("600px");
    unmount();
  });

  it("renders StackedPlot with string dimensions", () => {
    const { container, unmount } = render(() =>
      StackedPlot({
        panes: [{ id: "p", height: 1, series: [] }],
        width: "75%",
        height: "360px",
      }),
    );
    const el = container.querySelector(".velo-plot-stacked") as HTMLElement;
    expect(el.style.width).toBe("75%");
    expect(el.style.height).toBe("360px");
    unmount();
  });

  it("renders VeloPlot with string height", () => {
    const { container, unmount } = render(() =>
      VeloPlot({ series: [], height: "250px", width: "80%" }),
    );
    const el = container.querySelector(".velo-plot-container") as HTMLElement;
    expect(el.style.height).toBe("250px");
    expect(el.style.width).toBe("80%");
    unmount();
  });

  it("clears refs on unmount", () => {
    const { unmount: unmountVelo } = render(() =>
      VeloPlot({ series: [], class: "panel" }),
    );
    unmountVelo();
    const { unmount: unmountStack } = render(() =>
      StackedPlot({ panes: [{ id: "p", height: 1, series: [] }], class: "panel" }),
    );
    unmountStack();
  });

  it("renders without custom class", () => {
    const { container, unmount } = render(() => VeloPlot({ series: [] }));
    const el = container.querySelector(".velo-plot-container") as HTMLElement;
    expect(el.className).toBe("velo-plot-container");
    unmount();
  });

  it("renders StackedPlot without custom class", () => {
    const { container, unmount } = render(() =>
      StackedPlot({ panes: [{ id: "p", height: 1, series: [] }] }),
    );
    const el = container.querySelector(".velo-plot-stacked") as HTMLElement;
    expect(el.className).toBe("velo-plot-stacked");
    unmount();
  });

  it("uses default width and height when omitted", () => {
    const { container } = render(() => VeloPlot({ series: [] }));
    const el = container.querySelector(".velo-plot-container") as HTMLElement;
    expect(el.style.width).toBe("100%");
    expect(el.style.height).toBe("400px");
  });
});
