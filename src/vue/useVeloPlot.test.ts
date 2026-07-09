import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, onMounted, reactive } from "vue";
import { useVeloPlot } from "./useVeloPlot";
import { buildMockChart } from "../bindings/test-utils";
import { createChartLifecycle } from "../bindings/shared/chartLifecycle";
import * as shared from "../bindings/shared";

const mockChart = buildMockChart();
let lifecycleCallbacks: {
  onBoundsChange?: (b: unknown) => void;
  onError?: (e: Error) => void;
} = {};

vi.mock("../bindings/shared/chartLifecycle", () => ({
  createChartLifecycle: vi.fn((_el, _opts, callbacks = {}) => {
    lifecycleCallbacks = callbacks;
    return {
      chart: mockChart,
      getBounds: () => mockChart.getViewBounds(),
      destroy: mockChart.destroy,
    };
  }),
}));

vi.spyOn(shared, "optionsChanged");
vi.spyOn(shared, "syncChartOptions");

describe("useVeloPlot vue", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(shared.optionsChanged).mockReturnValue(false);
  });

  it("skips option sync before chart mounts", async () => {
    vi.mocked(shared.optionsChanged).mockReturnValue(true);
    const options = reactive({ theme: "dark" as const });
    const Comp = defineComponent({
      setup() {
        useVeloPlot(options);
        options.theme = "light";
        return () => h("span", "pending");
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    expect(shared.syncChartOptions).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("skips mount when container ref is missing", async () => {
    const Comp = defineComponent({
      setup() {
        useVeloPlot({ animations: false });
        return () => h("span", "no container");
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    expect(mockChart.destroy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("syncs options only when chart is mounted", async () => {
    vi.mocked(shared.optionsChanged).mockReturnValue(true);
    const options = reactive({ theme: "dark" as const });
    const Comp = defineComponent({
      setup() {
        const api = useVeloPlot(options);
        onMounted(() => {
          options.theme = "light";
        });
        return () => h("div", { ref: api.containerRef, style: "width:400px;height:300px" });
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    await nextTick();
    expect(shared.syncChartOptions).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("records non-error mount failures", async () => {
    vi.mocked(createChartLifecycle).mockImplementationOnce(() => {
      throw "mount failed";
    });
    const Comp = defineComponent({
      setup() {
        const api = useVeloPlot({});
        return () =>
          h("div", { ref: api.containerRef, style: "width:400px;height:300px" }, api.error.value?.message ?? "");
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    await nextTick();
    expect(wrapper.text()).toBe("mount failed");
    wrapper.unmount();
  });

  it("exposes chart methods and syncs options", async () => {
    vi.mocked(shared.optionsChanged).mockReturnValue(true);
    const options = reactive({ animations: false, theme: "dark" as const });
    const Comp = defineComponent({
      setup() {
        const api = useVeloPlot(options);
        onMounted(() => {
          api.addSeries({ id: "s", type: "line", data: { x: new Float32Array(), y: new Float32Array() } });
          api.updateSeries("s", { x: new Float32Array(), y: new Float32Array() });
          api.removeSeries("s");
          api.zoom({ x: [0, 1] });
          api.resetZoom();
          options.theme = "light";
        });
        return () => h("div", { ref: api.containerRef, style: "width:400px;height:300px" });
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    await nextTick();
    expect(mockChart.addSeries).toHaveBeenCalled();
    expect(shared.syncChartOptions).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("mounts chart on container ref", async () => {
    const Comp = defineComponent({
      setup() {
        const api = useVeloPlot({ animations: false });
        return () => h("div", { ref: api.containerRef, style: "width:400px;height:300px" });
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    await nextTick();
    wrapper.unmount();
    expect(mockChart.destroy).toHaveBeenCalled();
  });

  it("records lifecycle callbacks and mount errors", async () => {
    const Comp = defineComponent({
      setup() {
        const api = useVeloPlot({ animations: false });
        return () => h("div", { ref: api.containerRef, style: "width:400px;height:300px" });
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    lifecycleCallbacks.onBoundsChange?.(mockChart.getViewBounds());
    lifecycleCallbacks.onError?.(new Error("vue chart error"));

    vi.mocked(createChartLifecycle).mockImplementationOnce(() => {
      throw new Error("mount failed");
    });
    const errWrapper = mount(Comp);
    await nextTick();
    errWrapper.unmount();
    wrapper.unmount();
  });
});
