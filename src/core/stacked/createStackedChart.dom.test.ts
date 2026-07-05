/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Chart } from "../chart/types";

const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function buildMockChart(id: string): Chart & Record<string, ReturnType<typeof vi.fn>> {
  return {
    getId: () => id,
    addSeries: vi.fn(),
    zoom: vi.fn(),
    resize: vi.fn(),
    render: vi.fn(),
    destroy: vi.fn(),
    fit: vi.fn(),
    getViewBounds: vi.fn(() => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 50 })),
    getDPR: vi.fn(() => 1),
    setDPR: vi.fn(),
    exportImage: vi.fn(() => PNG_1X1),
    theme: { backgroundColor: "#0b0e14" },
    baseTheme: { backgroundColor: "#0b0e14" },
    setResizeSuspended: vi.fn(),
    updateYAxis: vi.fn(),
    updateXAxis: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    pan: vi.fn(),
  } as unknown as Chart & Record<string, ReturnType<typeof vi.fn>>;
}

const { mockCreateChart, mockGroup, chartsById, initQueueState } = vi.hoisted(() => {
  const chartsById = new Map<string, ReturnType<typeof buildMockChart>>();
  const initQueueState = { pending: 0, isProcessing: false };
  const mockCreateChart = vi.fn((opts: { id: string }) => {
    const chart = buildMockChart(opts.id);
    chartsById.set(opts.id, chart);
    return chart;
  });
  const mockGroup = {
    fitAll: vi.fn(),
    resetAll: vi.fn(),
    destroy: vi.fn(),
    syncAxis: vi.fn().mockReturnThis(),
    updateOptions: vi.fn().mockReturnThis(),
    getOptions: vi.fn(() => ({ axis: "x" as const })),
  };
  return { mockCreateChart, mockGroup, chartsById, initQueueState };
});

vi.mock("../Chart", () => ({ createChart: mockCreateChart }));
vi.mock("../sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../sync")>();
  return {
    ...actual,
    createChartGroup: vi.fn(() => mockGroup),
  };
});
vi.mock("../ChartInitQueue", () => ({
  getInitQueueStatus: () => initQueueState,
}));
vi.mock("./stackExport", () => ({
  exportStackImage: vi.fn(async () => PNG_1X1),
  stackResolutionScale: (r: string) => (r === "2k" ? 2 : 1),
}));

describe("createStackedChart (DOM)", () => {
  beforeEach(() => {
    chartsById.clear();
    mockCreateChart.mockClear();
    initQueueState.pending = 0;
    initQueueState.isProcessing = false;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function loadStack() {
    const mod = await import("./createStackedChart");
    return mod.createStackedChart;
  }

  it("builds a vertical two-pane stack with series and sync group", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      panes: [
        {
          id: "price",
          height: 0.6,
          series: [
            {
              id: "line",
              type: "line",
              data: { x: Float32Array.from([0, 1]), y: Float32Array.from([1, 2]) },
            },
          ],
        },
        {
          id: "vol",
          height: 0.4,
          series: [
            {
              id: "bars",
              type: "bar",
              data: { x: Float32Array.from([0, 1]), y: Float32Array.from([3, 4]) },
            },
          ],
        },
      ],
      resizable: true,
      gap: 4,
    });

    expect(mockCreateChart).toHaveBeenCalledTimes(2);
    expect(stack.getPanes()).toHaveLength(2);
    expect(stack.getPane("price")).toBeDefined();
    expect(stack.getMaster().getId()).toBe("price");

    stack.setPaneRatios({ price: 0.7, vol: 0.3 });
    expect(stack.getPaneRatios().price).toBeCloseTo(0.7);

    stack.setSyncAxis("xy");
    stack.setSyncOptions({ syncCursor: false });
    expect(stack.getSyncAxis()).toBe("x");

    stack.fitAll();
    stack.resetAll();
    stack.resize();
    expect(mockGroup.fitAll).toHaveBeenCalled();

    await stack.whenReady();
    stack.destroy();
    expect(mockGroup.destroy).toHaveBeenCalled();
    document.body.removeChild(container);
  });

  it("supports horizontal layout, indicator series, and yRange lock", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.width = "640px";
    container.style.height = "320px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      direction: "horizontal",
      sharedXAxis: "none",
      sharedYAxis: "left",
      sync: { axis: "y" },
      panes: [
        {
          id: "left",
          height: 0.5,
          yRange: [0, 100],
          series: [
            {
              id: "ind",
              type: "indicator" as const,
              data: {
                x: new Float32Array([0, 1, 2]),
                histogram: { y: new Float32Array([1, -1, 2]) },
              },
            },
          ],
        },
        {
          id: "right",
          height: 0.5,
          interactive: false,
          chart: { yAxis: { position: "right", tickCount: 4 } },
        },
      ],
    });

    expect(container.style.flexDirection).toBe("row");
    const left = stack.getPane("left");
    expect(left?.zoom).toHaveBeenCalledWith({ y: [0, 100], animate: false });
    expect(left?.addSeries).toHaveBeenCalled();

    stack.destroy();
    document.body.removeChild(container);
  });

  it("disables sync when sync:false and exports snapshot", async () => {
    const createStackedChart = await loadStack();
    const { exportStackImage } = await import("./stackExport");
    const container = document.createElement("div");
    container.style.height = "300px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      sync: false,
      panes: [{ id: "solo", height: 1 }],
    });

    const url = await stack.snapshot({ format: "png", fileName: "test-stack" });
    expect(url).toBe(PNG_1X1);
    expect(exportStackImage).toHaveBeenCalled();

    stack.destroy();
    document.body.removeChild(container);
  });

  it("throws when masterPaneId is unknown", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    expect(() =>
      createStackedChart({
        container,
        masterPaneId: "missing",
        panes: [{ id: "a", height: 1 }],
      }),
    ).toThrow(/masterPaneId/);
  });

  it("throws when container is missing", async () => {
    const createStackedChart = await loadStack();
    expect(() =>
      createStackedChart({ container: null as unknown as HTMLDivElement, panes: [{ id: "a", height: 1 }] }),
    ).toThrow(/container is required/);
  });

  it("handles pane resize drag, export download, and custom master", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    Object.defineProperty(container, "clientWidth", { value: 600, configurable: true });
    container.getBoundingClientRect = () =>
      ({
        width: 600,
        height: 400,
        top: 0,
        left: 0,
        right: 600,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(container);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const stack = createStackedChart({
      container,
      masterPaneId: "vol",
      resizable: { dividerSize: 8, minPaneRatio: 0.1 },
      gap: 6,
      panes: [
        {
          id: "price",
          height: "40%",
          chart: { yAxis: [{ position: "left" }, { position: "right", tickCount: 3 }] },
        },
        {
          id: "vol",
          height: 0.6,
          series: [{ id: "v", type: "bar", data: { x: Float32Array.from([0]), y: Float32Array.from([1]) } }],
        },
      ],
    });

    expect(stack.getMaster().getId()).toBe("vol");
    expect(stack.getGroup()).toBe(mockGroup);

    const dividers = container.querySelectorAll(".velo-pane-divider");
    expect(dividers.length).toBe(1);

    const divider = dividers[0] as HTMLDivElement;
    divider.dispatchEvent(
      new PointerEvent("pointerdown", { clientY: 160, bubbles: true, pointerId: 1 }),
    );
    divider.dispatchEvent(
      new PointerEvent("pointermove", { clientY: 200, bubbles: true, pointerId: 1 }),
    );
    divider.dispatchEvent(
      new PointerEvent("pointerup", { clientY: 200, bubbles: true, pointerId: 1 }),
    );

    stack.resize();
    await stack.exportImage({ download: true, fileName: "stack-shot", format: "jpeg" });
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
    stack.destroy();
    document.body.removeChild(container);
  });

  it("waits for init queue before whenReady resolves", async () => {
    const createStackedChart = await loadStack();
    vi.useFakeTimers();

    const container = document.createElement("div");
    container.style.height = "200px";
    document.body.appendChild(container);

    initQueueState.pending = 2;
    initQueueState.isProcessing = true;

    const stack = createStackedChart({
      container,
      panes: [{ id: "a", height: 1 }],
    });

    const ready = stack.whenReady();
    initQueueState.pending = 0;
    initQueueState.isProcessing = false;
    await vi.advanceTimersByTimeAsync(100);
    await ready;

    stack.destroy();
    vi.useRealTimers();
    document.body.removeChild(container);
  });

  it("supports three-pane resize and default container sizing", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      direction: "horizontal",
      sharedXAxis: "bottom",
      panes: [
        { id: "a", height: 0.34 },
        { id: "b", height: 0.33, interactive: false },
        { id: "c", height: 0.33, chart: { yAxis: { position: "right" } } },
      ],
      resizable: true,
    });

    expect(container.style.flexDirection).toBe("row");

    const dividers = container.querySelectorAll(".velo-pane-divider");
    expect(dividers.length).toBe(2);

    const firstDivider = dividers[0] as HTMLDivElement;
    firstDivider.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 200, bubbles: true, pointerId: 2 }),
    );
    firstDivider.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 240, bubbles: true, pointerId: 2 }),
    );
    firstDivider.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 240, bubbles: true, pointerId: 2 }),
    );

    stack.destroy();
    document.body.removeChild(container);
  });

  it("schedules layout on ResizeObserver callbacks", async () => {
    let observerCb: ResizeObserverCallback | undefined;
    class TestResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        observerCb = cb;
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", TestResizeObserver);

    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { value: 320, configurable: true });
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      panes: [{ id: "a", height: 1 }],
    });

    observerCb?.([], {} as ResizeObserver);
    observerCb?.([], {} as ResizeObserver);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    stack.destroy();
    document.body.removeChild(container);
    vi.unstubAllGlobals();
  });
});
