import { describe, it, expect, vi } from "vitest";
import { get } from "svelte/store";
import { createStackedPlot } from "./useStackedPlot";

const mockStack = {
  destroy: vi.fn(),
  whenReady: () => Promise.resolve(),
  container: document.createElement("div"),
  fitAll: vi.fn(),
  resetAll: vi.fn(),
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

describe("createStackedPlot svelte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paneKey = "a";
  });

  it("mounts stacked chart", () => {
    const el = document.createElement("div");
    const api = createStackedPlot({ panes: [{ id: "p", height: 1, series: [] }] });
    api.mount(el);
    expect(get(api.stack)).toBe(mockStack);
    api.fitAll();
    api.resetAll();
    api.unmount();
    expect(mockStack.destroy).toHaveBeenCalled();
  });

  it("syncs options when structure is unchanged", async () => {
    const { syncStackedOptions } = await import("../bindings/shared");
    paneKey = "same";
    const el = document.createElement("div");
    const api = createStackedPlot({ panes: [{ id: "p", height: 1, series: [] }], theme: "dark" });
    api.mount(el);
    await mockStack.whenReady();
    api.sync({ panes: [{ id: "p", height: 1, series: [] }], theme: "light" });
    expect(syncStackedOptions).toHaveBeenCalled();
    api.unmount();
  });

  it("skips sync when stack is not ready", async () => {
    const { syncStackedOptions } = await import("../bindings/shared");
    paneKey = "same";
    const api = createStackedPlot({ panes: [{ id: "p", height: 1, series: [] }] });
    api.sync({ panes: [{ id: "p", height: 1, series: [] }], theme: "dark" });
    expect(syncStackedOptions).not.toHaveBeenCalled();
  });

  it("remounts when pane structure changes", async () => {
    paneKey = "a";
    const el = document.createElement("div");
    const api = createStackedPlot({ panes: [{ id: "p", height: 1, series: [] }] });
    api.mount(el);
    await mockStack.whenReady();
    paneKey = "b";
    api.sync({ panes: [{ id: "q", height: 1, series: [] }] });
    expect(mockStack.destroy).toHaveBeenCalled();
  });
});
