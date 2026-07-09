import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { useVeloPlot } from "./useVeloPlot";
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

describe("useVeloPlot solid", () => {
  it("uses default options getter", () => {
    const el = document.createElement("div");
    const dispose = createRoot((disposeFn) => {
      const api = useVeloPlot();
      api.setContainerRef(el);
      expect(api.isReady()).toBe(true);
      return disposeFn;
    });
    dispose();
  });

  it("remounts when container changes", () => {
    const el1 = document.createElement("div");
    const el2 = document.createElement("div");
    const dispose = createRoot((disposeFn) => {
      const api = useVeloPlot(() => ({}));
      api.setContainerRef(el1);
      api.setContainerRef(el2);
      return disposeFn;
    });
    dispose();
    expect(mockChart.destroy).toHaveBeenCalled();
  });

  it("mounts chart via container ref", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const dispose = createRoot((disposeFn) => {
      const api = useVeloPlot(() => ({}));
      api.setContainerRef(el);
      expect(api.isReady()).toBe(true);
      return disposeFn;
    });
    dispose();
    expect(mockChart.destroy).toHaveBeenCalled();
    el.remove();
  });

  it("syncs options and exposes chart methods", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const dispose = createRoot((disposeFn) => {
      const api = useVeloPlot(() => ({ theme: "dark" }));
      api.setContainerRef(el);
      api.addSeries({ id: "s", type: "line", data: { x: new Float32Array(), y: new Float32Array() } });
      api.resetZoom();
      api.zoom({ x: [0, 1] });
      api.updateSeries("s", { x: new Float32Array(), y: new Float32Array() });
      api.removeSeries("s");
      expect(shared.syncChartOptions).toHaveBeenCalled();
      return disposeFn;
    });
    dispose();
    el.remove();
  });

  it("skips remount on same container", () => {
    const el = document.createElement("div");
    const dispose = createRoot((disposeFn) => {
      const api = useVeloPlot(() => ({}));
      api.setContainerRef(el);
      api.setContainerRef(el);
      expect(api.isReady()).toBe(true);
      return disposeFn;
    });
    dispose();
  });

  it("records lifecycle errors via onError", async () => {
    const { createChartLifecycle } = await import("../bindings/shared/chartLifecycle");
    vi.mocked(createChartLifecycle).mockImplementationOnce((_el, _opts, callbacks = {}) => {
      queueMicrotask(() => callbacks.onError?.(new Error("solid lifecycle")));
      return {
        chart: mockChart,
        getBounds: () => mockChart.getViewBounds(),
        destroy: mockChart.destroy,
      };
    });
    const el = document.createElement("div");
    let readError = () => "";
    const dispose = createRoot((disposeFn) => {
      const api = useVeloPlot(() => ({}));
      readError = () => api.error()?.message ?? "";
      api.setContainerRef(el);
      return disposeFn;
    });
    await Promise.resolve();
    expect(readError()).toBe("solid lifecycle");
    dispose();
  });

  it("ignores null container ref", () => {
    const dispose = createRoot((disposeFn) => {
      const api = useVeloPlot(() => ({}));
      api.setContainerRef(null);
      expect(api.isReady()).toBe(false);
      return disposeFn;
    });
    dispose();
  });
});
