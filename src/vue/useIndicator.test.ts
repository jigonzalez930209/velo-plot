import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { useIndicator } from "./useIndicator";
import { buildMockChart } from "../bindings/test-utils";

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    addIndicatorToHost: vi.fn(async () => ({ id: "rsi", seriesIds: ["rsi"] })),
    removeIndicatorFromChart: vi.fn(),
    isStackedChart: vi.fn(() => false),
  };
});

describe("useIndicator vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads indicator and cleans up on unmount", async () => {
    const chart = buildMockChart();
    const Comp = defineComponent({
      setup() {
        const api = useIndicator(() => chart, "rsi");
        return () => h("span", api.isLoading.value ? "loading" : "done");
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    await nextTick();
    expect(wrapper.text()).toBe("done");
    wrapper.unmount();
    const { removeIndicatorFromChart } = await import("../bindings/shared");
    expect(removeIndicatorFromChart).toHaveBeenCalled();
  });

  it("records errors", async () => {
    const { addIndicatorToHost } = await import("../bindings/shared");
    vi.mocked(addIndicatorToHost).mockRejectedValueOnce(new Error("indicator fail"));
    const Comp = defineComponent({
      setup() {
        const api = useIndicator(() => buildMockChart(), "macd");
        return () => h("span", api.error.value?.message ?? "");
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    await nextTick();
    expect(wrapper.text()).toBe("indicator fail");
  });

  it("skips cleanup for stacked hosts on unmount", async () => {
    const { isStackedChart, removeIndicatorFromChart } = await import("../bindings/shared");
    vi.mocked(isStackedChart).mockReturnValue(true);
    const chart = buildMockChart();
    const Comp = defineComponent({
      setup() {
        useIndicator(() => chart, "ema");
        return () => h("span", "ok");
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    await nextTick();
    wrapper.unmount();
    expect(removeIndicatorFromChart).not.toHaveBeenCalled();
  });

  it("skips when host is null", async () => {
    const Comp = defineComponent({
      setup() {
        const api = useIndicator(() => null, "rsi");
        return () => h("span", api.isLoading.value ? "loading" : "idle");
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    expect(wrapper.text()).toBe("idle");
  });

  it("wraps non-error rejections", async () => {
    const { addIndicatorToHost } = await import("../bindings/shared");
    vi.mocked(addIndicatorToHost).mockRejectedValueOnce("plain failure");
    const Comp = defineComponent({
      setup() {
        const api = useIndicator(() => buildMockChart(), "macd");
        return () => h("span", api.error.value?.message ?? "");
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    await nextTick();
    expect(wrapper.text()).toBe("plain failure");
  });
});
