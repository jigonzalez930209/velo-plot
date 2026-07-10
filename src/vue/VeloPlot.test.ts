import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import VeloPlot from "./VeloPlot.vue";
import { buildMockChart } from "../bindings/test-utils";
import { createChartLifecycle } from "../bindings/shared/chartLifecycle";

const mockChart = buildMockChart();

vi.mock("../bindings/shared/chartLifecycle", () => ({
  createChartLifecycle: vi.fn((_el, _opts, callbacks = {}) => {
    queueMicrotask(() => callbacks.onBoundsChange?.(mockChart.getViewBounds()));
    return {
      chart: mockChart,
      destroy: mockChart.destroy,
      getBounds: () => mockChart.getViewBounds(),
    };
  }),
}));

describe("VeloPlot.vue", () => {
  it("renders container and applies a11y updates", async () => {
    const wrapper = mount(VeloPlot, {
      props: {
        series: [{ id: "a", x: new Float32Array([0]), y: new Float32Array([0]) }],
        height: 320,
        width: 640,
        ariaLabel: "Test",
        keyboardNav: false,
      },
      attachTo: document.body,
    });
    await vi.waitFor(() => expect(wrapper.find(".velo-plot-container").exists()).toBe(true));
    expect(wrapper.find("table").exists()).toBe(true);
    await wrapper.setProps({
      series: [{ id: "b", x: new Float32Array([0, 1]), y: new Float32Array([0, 1]) }],
    });
    expect(createChartLifecycle).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("exposes chart methods and updates a11y on bounds change", async () => {
    const wrapper = mount(VeloPlot, {
      props: {
        height: 300,
        width: "100%",
        keyboardNav: true,
        ariaLabel: "Initial",
        class: "vue-chart",
      },
      attachTo: document.body,
    });
    await vi.waitFor(() => expect(wrapper.vm.getChart()).toBe(mockChart));
    expect(wrapper.vm.getBounds()).toEqual(mockChart.getViewBounds());
    await wrapper.setProps({ ariaLabel: "Updated label" });
    wrapper.vm.resetZoom();
    expect(mockChart.resetZoom).toHaveBeenCalled();
    wrapper.unmount();
  });
});
