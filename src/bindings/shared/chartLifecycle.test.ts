import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createChartLifecycle, attachZoomListener } from "./chartLifecycle";
import { buildMockChart } from "../test-utils";

const mockChart = buildMockChart();
let zoomHandler: (() => void) | undefined;

vi.mock("../../core/Chart", () => ({
  createChart: vi.fn(() => mockChart),
}));

describe("chartLifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChart.on.mockImplementation((_event: string, handler: () => void) => {
      if (_event === "zoom") zoomHandler = handler;
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
    zoomHandler = undefined;
  });

  it("creates chart with responsive defaults and resize observer", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn(() => ({ observe, disconnect })),
    );

    const handle = createChartLifecycle(el, { animations: false });
    expect(handle.chart).toBe(mockChart);
    expect(observe).toHaveBeenCalledWith(el);

    handle.destroy();
    expect(disconnect).toHaveBeenCalled();
    expect(mockChart.off).toHaveBeenCalledWith("zoom", expect.any(Function));
    expect(mockChart.destroy).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("skips ResizeObserver when autoResize is false", () => {
    const el = document.createElement("div");
    const ResizeObserverMock = vi.fn();
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    createChartLifecycle(el, { autoResize: false }).destroy();
    expect(ResizeObserverMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("fires onBoundsChange on zoom", () => {
    const el = document.createElement("div");
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() })),
    );
    const onBoundsChange = vi.fn();
    createChartLifecycle(el, {}, { onBoundsChange });
    zoomHandler?.();
    expect(onBoundsChange).toHaveBeenCalledWith(mockChart.getViewBounds());
    vi.unstubAllGlobals();
  });

  it("attachZoomListener unsubscribes", () => {
    const onBoundsChange = vi.fn();
    const unsub = attachZoomListener(mockChart, onBoundsChange);
    zoomHandler?.();
    expect(onBoundsChange).toHaveBeenCalled();
    unsub();
    expect(mockChart.off).toHaveBeenCalled();
  });

  it("preserves explicit responsive options and resizes on observer callback", () => {
    const el = document.createElement("div");
    let observerCallback: () => void = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn((callback: () => void) => {
        observerCallback = callback;
        return { observe: vi.fn(), disconnect: vi.fn() };
      }),
    );
    const handle = createChartLifecycle(el, {
      responsive: { reducedMotion: "reduce" },
    });
    observerCallback();
    expect(mockChart.resize).toHaveBeenCalled();
    handle.destroy();
    vi.unstubAllGlobals();
  });

  it("exposes getBounds from lifecycle handle", () => {
    const el = document.createElement("div");
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() })),
    );
    const handle = createChartLifecycle(el, { animations: false });
    expect(handle.getBounds()).toEqual(mockChart.getViewBounds());
    handle.destroy();
    vi.unstubAllGlobals();
  });

  it("zoom handler runs without onBoundsChange callback", () => {
    const el = document.createElement("div");
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() })),
    );
    createChartLifecycle(el, { animations: false });
    zoomHandler?.();
    vi.unstubAllGlobals();
  });
});
