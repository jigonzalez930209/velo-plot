import { describe, it, expect, vi, afterEach } from "vitest";
import { get } from "svelte/store";
import { createVeloPlot } from "./useVeloPlot";
import { buildMockChart } from "../bindings/test-utils";
import * as shared from "../bindings/shared";

const mockChart = buildMockChart();

vi.mock("../bindings/shared/chartLifecycle", () => ({
  createChartLifecycle: vi.fn(() => ({
    chart: mockChart,
    getBounds: () => mockChart.getViewBounds(),
    destroy: mockChart.destroy,
  })),
}));

vi.spyOn(shared, "optionsChanged").mockReturnValue(true);
vi.spyOn(shared, "syncChartOptions");

describe("createVeloPlot svelte", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
    vi.mocked(shared.optionsChanged).mockReturnValue(true);
  });

  it("mounts and exercises chart API", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const api = createVeloPlot({ animations: false });
    api.mount(el);
    expect(get(api.isReady)).toBe(true);
    api.addSeries({ id: "s", type: "line", data: { x: new Float32Array(), y: new Float32Array() } });
    api.updateSeries("s", { x: new Float32Array(), y: new Float32Array() });
    api.removeSeries("s");
    api.zoom({ x: [0, 1] });
    api.resetZoom();
    api.updateOptions({ theme: "dark" });
    expect(shared.syncChartOptions).toHaveBeenCalled();
    api.unmount();
    expect(mockChart.destroy).toHaveBeenCalled();
    el.remove();
  });

  it("remounts chart on second mount call", () => {
    const el = document.createElement("div");
    const api = createVeloPlot({});
    api.mount(el);
    api.mount(el);
    expect(mockChart.destroy).toHaveBeenCalled();
    api.unmount();
  });

  it("invokes onBoundsChange from lifecycle", async () => {
    const el = document.createElement("div");
    const api = createVeloPlot({});
    api.mount(el);
    const { createChartLifecycle } = await import("../bindings/shared/chartLifecycle");
    const callbacks = vi.mocked(createChartLifecycle).mock.calls.at(-1)?.[2] ?? {};
    callbacks.onBoundsChange?.(mockChart.getViewBounds());
    expect(get(api.bounds)).toEqual(mockChart.getViewBounds());
    api.unmount();
  });

  it("updateOptions skips sync when chart is missing", () => {
    const api = createVeloPlot({ theme: "dark" });
    vi.mocked(shared.syncChartOptions).mockClear();
    api.updateOptions({ theme: "light" });
    expect(shared.syncChartOptions).not.toHaveBeenCalled();
  });

  it("updateOptions skips sync when options are unchanged", () => {
    vi.mocked(shared.optionsChanged).mockReturnValue(false);
    const el = document.createElement("div");
    const api = createVeloPlot({ theme: "dark" });
    api.mount(el);
    vi.mocked(shared.syncChartOptions).mockClear();
    api.updateOptions({ theme: "dark" });
    expect(shared.syncChartOptions).not.toHaveBeenCalled();
    api.unmount();
  });

  it("records lifecycle errors", async () => {
    const { createChartLifecycle } = await import("../bindings/shared/chartLifecycle");
    vi.mocked(createChartLifecycle).mockImplementationOnce((_el, _opts, callbacks = {}) => {
      queueMicrotask(() => callbacks.onError?.(new Error("svelte lifecycle")));
      return {
        chart: mockChart,
        getBounds: () => mockChart.getViewBounds(),
        destroy: mockChart.destroy,
      };
    });
    const el = document.createElement("div");
    const api = createVeloPlot({});
    api.mount(el);
    await Promise.resolve();
    expect(get(api.error)?.message).toBe("svelte lifecycle");
    api.unmount();
  });
});
