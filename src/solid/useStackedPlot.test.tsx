import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { useStackedPlot } from "./useStackedPlot";
import { buildMockChart } from "../bindings/test-utils";

const mockStack = {
  destroy: vi.fn(),
  whenReady: () => Promise.resolve(),
  container: document.createElement("div"),
  fitAll: vi.fn(),
  resetAll: vi.fn(),
  getPanes: () => [],
};
let paneKey = "a";

vi.mock("../core/stacked", () => ({
  createStackedChart: vi.fn(() => mockStack),
}));

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    stackedStructureKey: () => paneKey,
    syncStackedPaneSeries: vi.fn(() => new Map()),
    syncStackedOptions: vi.fn(),
  };
});

describe("useStackedPlot solid", () => {
  it("mounts stacked chart and exposes fitAll/resetAll", async () => {
    const el = document.createElement("div");
    const dispose = createRoot((disposeFn) => {
      const api = useStackedPlot(() => ({
        panes: [{ id: "p", height: 1, series: [] }],
      }));
      api.setContainerRef(el);
      api.fitAll();
      api.resetAll();
      expect(mockStack.fitAll).toHaveBeenCalled();
      expect(mockStack.resetAll).toHaveBeenCalled();
      return disposeFn;
    });
    dispose();
    expect(mockStack.destroy).toHaveBeenCalled();
  });

  it("sync remounts when structure changes", async () => {
    paneKey = "a";
    const el = document.createElement("div");
    const dispose = createRoot((disposeFn) => {
      const api = useStackedPlot(() => ({
        panes: [{ id: "p", height: 1, series: [] }],
      }));
      api.setContainerRef(el);
      paneKey = "b";
      api.sync();
      return disposeFn;
    });
    dispose();
  });

  it("remounts when container is set again after structure change", async () => {
    paneKey = "a";
    const el = document.createElement("div");
    let api!: ReturnType<typeof useStackedPlot>;
    const dispose = createRoot((disposeFn) => {
      api = useStackedPlot(() => ({
        panes: [{ id: "p", height: 1, series: [] }],
      }));
      api.setContainerRef(el);
      return disposeFn;
    });
    await mockStack.whenReady();
    paneKey = "b";
    api.sync();
    expect(mockStack.destroy).toHaveBeenCalled();
    dispose();
  });

  it("syncs options when structure is unchanged", async () => {
    const { syncStackedOptions } = await import("../bindings/shared");
    paneKey = "same";
    const el = document.createElement("div");
    let api!: ReturnType<typeof useStackedPlot>;
    const dispose = createRoot((disposeFn) => {
      api = useStackedPlot(() => ({
        panes: [{ id: "p", height: 1, series: [] }],
        theme: "dark",
      }));
      api.setContainerRef(el);
      return disposeFn;
    });
    await mockStack.whenReady();
    await Promise.resolve();
    api.sync();
    expect(syncStackedOptions).toHaveBeenCalled();
    dispose();
  });

  it("fitAll forwards options", () => {
    const el = document.createElement("div");
    const dispose = createRoot((disposeFn) => {
      const api = useStackedPlot(() => ({ panes: [{ id: "p", height: 1, series: [] }] }));
      api.setContainerRef(el);
      api.fitAll({ padding: 4 });
      return disposeFn;
    });
    dispose();
    expect(mockStack.fitAll).toHaveBeenCalledWith({ padding: 4 });
  });
});
