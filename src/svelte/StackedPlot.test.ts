import { describe, it, expect, vi, afterEach } from "vitest";
import { mount, flushSync, unmount } from "svelte";
import StackedPlot from "./StackedPlot.svelte";

const mockStack = {
  destroy: vi.fn(),
  whenReady: () => Promise.resolve(),
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
    syncStackedPaneSeries: () => new Map(),
    syncStackedOptions: vi.fn(),
  };
});

describe("StackedPlot.svelte", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("renders with empty class by default", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const component = mount(StackedPlot, {
      target,
      props: {
        panes: [{ id: "p", height: 1, series: [] }],
      },
    });
    flushSync();
    const el = target.querySelector(".velo-plot-stacked") as HTMLElement;
    expect(el.className).toBe("velo-plot-stacked");
    unmount(component);
  });

  it("renders with custom class", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const component = mount(StackedPlot, {
      target,
      props: {
        panes: [{ id: "p", height: 1, series: [] }],
        class: "stack-panel",
        width: "100%",
        height: 480,
      },
    });
    flushSync();
    expect(target.querySelector(".velo-plot-stacked.stack-panel")).toBeTruthy();
    unmount(component);
  });

  it("renders with string height and numeric width", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const component = mount(StackedPlot, {
      target,
      props: {
        panes: [{ id: "p", height: 1, series: [] }],
        width: 500,
        height: "50%",
      },
    });
    flushSync();
    const el = target.querySelector(".velo-plot-stacked") as HTMLElement;
    const style = el.getAttribute("style") ?? "";
    expect(style.includes("500px") || el.style.width === "500px").toBe(true);
    expect(style.includes("50%") || el.style.height === "50%").toBe(true);
    unmount(component);
  });

  it("renders stacked container and syncs options", () => {
    paneKey = "a";
    const target = document.createElement("div");
    document.body.appendChild(target);
    const first = mount(StackedPlot, {
      target,
      props: {
        panes: [{ id: "p", height: 1, series: [] }],
        width: 500,
        height: 300,
        class: "stacked",
      },
    });
    flushSync();
    expect(target.querySelector(".velo-plot-stacked.stacked")).toBeTruthy();
    unmount(first);
    paneKey = "b";
    mount(StackedPlot, {
      target,
      props: {
        panes: [{ id: "q", height: 1, series: [] }],
        stackOptions: { theme: "dark" },
        width: "100%",
        height: 480,
      },
    });
    flushSync();
    expect(mockStack.destroy).toHaveBeenCalled();
  });
});
