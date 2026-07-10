import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, shallowRef } from "vue";
import StackedPlot from "./StackedPlot.vue";

const mockChart = {
  getViewBounds: () => ({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }),
};
const mockStack = {
  destroy: vi.fn(),
  whenReady: () => Promise.resolve(),
  fitAll: vi.fn(),
  resetAll: vi.fn(),
  getMaster: () => mockChart,
};

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

vi.mock("./useStackedPlot", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./useStackedPlot")>();
  return {
    ...actual,
    useStackedPlot: vi.fn(actual.useStackedPlot),
  };
});

describe("StackedPlot.vue", () => {
  it("returns null bounds when stack is unavailable", async () => {
    const { useStackedPlot } = await import("./useStackedPlot");
    vi.mocked(useStackedPlot).mockReturnValueOnce({
      containerRef: ref(null),
      stack: shallowRef(null),
      isReady: ref(false),
      fitAll: vi.fn(),
      resetAll: vi.fn(),
    });
    const wrapper = mount(StackedPlot, {
      props: { panes: [{ id: "p", height: 1, series: [] }] },
    });
    expect(wrapper.vm.getBounds()).toBeNull();
    wrapper.unmount();
  });

  it("renders with default aria label before ready", () => {
    const wrapper = mount(StackedPlot, {
      props: {
        panes: [{ id: "p", height: 1, series: [] }],
      },
    });
    expect(wrapper.attributes("aria-label")).toContain("1 panes");
    wrapper.unmount();
  });

  it("renders stacked container with default aria label", async () => {
    const wrapper = mount(StackedPlot, {
      props: {
        panes: [{ id: "price", height: 0.6, series: [] }, { id: "vol", height: 0.4, series: [] }],
        height: "50%",
        width: "100%",
      },
      attachTo: document.body,
    });
    await vi.waitFor(() => expect(wrapper.attributes("data-ready")).toBe("true"));
    expect(wrapper.attributes("aria-label")).toContain("2 panes");
    wrapper.unmount();
  });

  it("renders stacked container and exposes stack API", async () => {
    const wrapper = mount(StackedPlot, {
      props: {
        panes: [{ id: "p", height: 1, series: [] }],
        height: 400,
        width: 500,
        class: "stacked",
        ariaLabel: "Vue stack",
      },
      attachTo: document.body,
    });
    expect(wrapper.find(".velo-plot-stacked.stacked").exists()).toBe(true);
    await vi.waitFor(() => expect(wrapper.attributes("data-ready")).toBe("true"));
    expect(wrapper.attributes("aria-label")).toBe("Vue stack");
    expect(wrapper.vm.getStack()).toBeTruthy();
    wrapper.vm.fitAll();
    wrapper.vm.resetAll();
    expect(wrapper.vm.getBounds()).toEqual(mockChart.getViewBounds());
    expect(mockStack.fitAll).toHaveBeenCalled();
    wrapper.unmount();
    expect(mockStack.destroy).toHaveBeenCalled();
  });
});
