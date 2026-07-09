import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import { useChartSync } from "./useChartSync";

const destroy = vi.fn();

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    createChartSync: vi.fn(() => ({
      group: { id: "g1" },
      destroy,
    })),
  };
});

function chart(id: string) {
  return {
    getId: () => id,
    getViewBounds: () => ({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }),
    zoom: vi.fn(),
    pan: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe("useChartSync vue", () => {
  it("destroys sync on unmount", async () => {
    const charts = [chart("a"), chart("b")];
    const Comp = defineComponent({
      setup() {
        useChartSync(() => charts, { axis: "x" });
        return () => h("span", "ok");
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    wrapper.unmount();
    expect(destroy).toHaveBeenCalled();
  });

  it("skips sync for a single chart", () => {
    const Comp = defineComponent({
      setup() {
        const { group } = useChartSync(() => [chart("a")]);
        return () => h("span", group.value ? "synced" : "none");
      },
    });
    const wrapper = mount(Comp);
    expect(wrapper.text()).toBe("none");
  });

  it("clears group when chart list shrinks", async () => {
    const charts = ref([chart("a"), chart("b")]);
    const Comp = defineComponent({
      setup() {
        const { group } = useChartSync(() => charts.value);
        return () => h("span", group.value ? "synced" : "none");
      },
    });
    const wrapper = mount(Comp);
    await nextTick();
    expect(wrapper.text()).toBe("synced");
    charts.value = [chart("a")];
    await nextTick();
    expect(wrapper.text()).toBe("none");
    wrapper.unmount();
  });
});
