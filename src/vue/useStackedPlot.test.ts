import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, onMounted, reactive } from "vue";
import { useStackedPlot } from "./useStackedPlot";

const mockDestroy = vi.fn();
const mockFitAll = vi.fn();
let paneKey = "a";

vi.mock("../core/stacked", () => ({
  createStackedChart: vi.fn(() => ({
    destroy: mockDestroy,
    whenReady: () => Promise.resolve(),
    fitAll: mockFitAll,
    resetAll: vi.fn(),
  })),
}));

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    stackedStructureKey: () => paneKey,
    syncStackedPaneSeries: () => new Map(),
    syncStackedOptions: vi.fn(),
  };
});

describe("useStackedPlot vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paneKey = "a";
  });

  it("mounts stacked chart", async () => {
    const Comp = defineComponent({
      setup() {
        const { containerRef } = useStackedPlot({
          panes: [{ id: "p1", height: 1, series: [] }],
        });
        return () => h("div", { ref: containerRef, "data-testid": "stack" });
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    await nextTick();
    wrapper.unmount();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it("skips mount when container is missing", async () => {
    const { createStackedChart } = await import("../core/stacked");
    const Comp = defineComponent({
      setup() {
        useStackedPlot({ panes: [{ id: "p1", height: 1, series: [] }] });
        return () => h("span", "no container");
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    expect(createStackedChart).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("skips option sync until stack is ready", async () => {
    const { syncStackedOptions } = await import("../bindings/shared");
    const stacked = await import("../core/stacked");
    vi.mocked(stacked.createStackedChart).mockImplementationOnce(() => ({
      destroy: mockDestroy,
      whenReady: () => new Promise(() => {}),
      fitAll: mockFitAll,
      resetAll: vi.fn(),
    }));
    const options = reactive({
      panes: [{ id: "p1", height: 1, series: [] }],
      theme: "dark" as const,
    });
    const Comp = defineComponent({
      setup() {
        const api = useStackedPlot(options);
        options.theme = "light";
        return () => h("div", { ref: api.containerRef, style: "width:400px;height:300px" });
      },
    });
    const wrapper = mount(Comp, { attachTo: document.body });
    await nextTick();
    expect(syncStackedOptions).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("remounts when pane structure changes", async () => {
    paneKey = "a";
    const options = reactive({
      panes: [{ id: "p1", height: 1, series: [] }],
    });
    const Comp = defineComponent({
      setup() {
        const api = useStackedPlot(options);
        return () => h("div", { ref: api.containerRef });
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    await nextTick();
    await Promise.resolve();
    paneKey = "b";
    options.panes = [{ id: "p2", height: 1, series: [] }];
    await nextTick();
    wrapper.unmount();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it("syncs options when structure is unchanged", async () => {
    const { syncStackedOptions } = await import("../bindings/shared");
    paneKey = "same";
    const options = reactive({
      panes: [{ id: "p1", height: 1, series: [] }],
      theme: "dark" as const,
    });
    const Comp = defineComponent({
      setup() {
        const api = useStackedPlot(options);
        return () => h("div", { ref: api.containerRef, style: "width:400px;height:300px" });
      },
    });
    const wrapper = mount(Comp, { attachTo: document.body });
    await nextTick();
    await nextTick();
    await Promise.resolve();
    options.theme = "light";
    await vi.waitFor(() => expect(syncStackedOptions).toHaveBeenCalled());
    wrapper.unmount();
  });

  it("calls fitAll with options", async () => {
    const Comp = defineComponent({
      setup() {
        const api = useStackedPlot({
          panes: [{ id: "p1", height: 1, series: [] }],
        });
        onMounted(() => api.fitAll({ padding: 2 }));
        return () => h("div", { ref: api.containerRef, style: "width:400px;height:300px" });
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    await nextTick();
    expect(mockFitAll).toHaveBeenCalledWith({ padding: 2 });
    wrapper.unmount();
  });
});
