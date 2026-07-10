import { describe, it, expect, vi, afterEach } from "vitest";
import { mount, flushSync, unmount } from "svelte";
import VeloPlot from "./VeloPlot.svelte";
import { buildMockChart } from "../bindings/test-utils";

const mockChart = buildMockChart();

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

describe("VeloPlot.svelte", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("renders with empty class by default", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const component = mount(VeloPlot, {
      target,
      props: { series: [] },
    });
    flushSync();
    const el = target.querySelector(".velo-plot-container") as HTMLElement;
    expect(el.className).toBe("velo-plot-container");
    unmount(component);
  });

  it("renders with custom class and string height", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const component = mount(VeloPlot, {
      target,
      props: {
        series: [],
        class: "chart-panel",
        width: 640,
        height: "50vh",
      },
    });
    flushSync();
    const el = target.querySelector(".velo-plot-container.chart-panel") as HTMLElement;
    expect(el).toBeTruthy();
    const style = el.getAttribute("style") ?? "";
    expect(style.includes("50vh") || el.style.height === "50vh").toBe(true);
    unmount(component);
  });

  it("renders with string width and numeric height", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const component = mount(VeloPlot, {
      target,
      props: {
        series: [],
        width: "100%",
        height: 320,
      },
    });
    flushSync();
    const el = target.querySelector(".velo-plot-container") as HTMLElement;
    expect(el.style.width || el.getAttribute("style")).toContain("100%");
    expect(el.style.height || el.getAttribute("style")).toContain("320px");
    unmount(component);
  });

  it("mounts chart container and syncs series", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    const component = mount(VeloPlot, {
      target,
      props: {
        series: [{ id: "a", x: new Float32Array([0]), y: new Float32Array([0]) }],
        width: 640,
        height: 320,
        class: "custom",
        chartOptions: { animations: false },
      },
    });
    flushSync();
    expect(target.querySelector(".velo-plot-container.custom")).toBeTruthy();
    unmount(component);
    const updated = mount(VeloPlot, {
      target,
      props: {
        series: [{ id: "b", x: new Float32Array([0, 1]), y: new Float32Array([0, 1]) }],
        width: "100%",
        height: 400,
        chartOptions: { theme: "dark" },
      },
    });
    flushSync();
    expect(mockChart.addSeries).toHaveBeenCalled();
    unmount(updated);
  });
});
