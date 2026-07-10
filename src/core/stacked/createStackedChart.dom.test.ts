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
    updateLayout: vi.fn(),
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
    add: vi.fn().mockReturnThis(),
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
vi.mock("../indicator/addIndicator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../indicator/addIndicator")>();
  return {
    ...actual,
    addIndicatorToChart: vi.fn(async () => ({
      id: "rsi",
      preset: "rsi",
      placement: "overlay" as const,
      seriesIds: ["rsi"],
    })),
    buildIndicatorPaneFromPreset: vi.fn(async (_preset, _x, _prices, opts) => ({
      id: opts.id,
      height: opts.height,
      series: [{ id: `${opts.id}-line`, type: "line", data: { x: new Float32Array(0), y: new Float32Array(0) } }],
    })),
  };
});
vi.mock("../indicator/indicatorPresets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../indicator/indicatorPresets")>();
  return {
    ...actual,
    resolveSourceSeries: vi.fn(() => ({ getId: () => "src" })),
    extractPriceSeries: vi.fn(() => ({
      x: Float32Array.from([0, 1, 2]),
      prices: Float32Array.from([10, 11, 12]),
    })),
  };
});

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

  it("keeps stack height stable when clicking a resize divider", async () => {
    const queued: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      queued.push(cb);
      return queued.length;
    });

    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "400px";
    Object.defineProperty(container, "clientHeight", {
      get: () => parseInt(container.style.height, 10) || 400,
      configurable: true,
    });
    Object.defineProperty(container, "clientWidth", { value: 600, configurable: true });
    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const isContainer = this === container;
      const h = isContainer
        ? 400
        : this.classList?.contains("velo-pane-divider")
          ? 6
          : 197;
      const w = 600;
      return {
        width: w,
        height: h,
        top: 0,
        left: 0,
        right: w,
        bottom: h,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      resizable: true,
      panes: [
        { id: "price", height: 0.7 },
        { id: "vol", height: 0.3 },
      ],
    });

    const heightBefore = container.style.height;
    const divider = container.querySelector(".velo-pane-divider") as HTMLDivElement;
    divider.setPointerCapture = vi.fn();
    divider.releasePointerCapture = vi.fn();
    divider.dispatchEvent(
      new PointerEvent("pointerdown", { clientY: 280, bubbles: true, pointerId: 40 }),
    );
    while (queued.length) queued.shift()?.(0);

    // Host size must stay owned by the container — never grow on divider click.
    expect(container.style.height).toBe(heightBefore);
    expect(container.style.maxHeight).toBe("none");
    expect(parseInt(container.style.height, 10)).toBe(400);

    divider.dispatchEvent(
      new PointerEvent("pointerup", { clientY: 280, bubbles: true, pointerId: 40 }),
    );
    expect(container.style.height).toBe(heightBefore);
    expect(container.style.maxHeight).toBe("none");

    rectSpy.mockRestore();
    stack.destroy();
    document.body.removeChild(container);
    vi.unstubAllGlobals();
  });

  it("preserves host height and fills width on create", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "480px";
    container.style.width = "100%";
    Object.defineProperty(container, "clientHeight", { value: 480, configurable: true });
    Object.defineProperty(container, "clientWidth", { value: 800, configurable: true });
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      panes: [
        { id: "a", height: 0.6 },
        { id: "b", height: 0.4 },
      ],
    });

    expect(container.style.height).toBe("480px");
    expect(container.style.width).toBe("100%");
    expect(container.style.maxHeight).toBe("none");
    expect(container.style.display).toBe("flex");

    stack.destroy();
    document.body.removeChild(container);
  });

  it("rebuilds resize dividers when a pane is added to a resizable stack", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      resizable: true,
      sharedXAxis: "bottom",
      panes: [{ id: "price", height: 1 }],
    });
    expect(container.querySelectorAll(".velo-pane-divider")).toHaveLength(0);

    stack.addPane({ id: "rsi", height: 0.3 });
    expect(container.querySelectorAll(".velo-pane-divider")).toHaveLength(1);
    expect(container.querySelector(".velo-pane-divider-handle")?.textContent).toBe("⇕");

    stack.addPane({ id: "macd", height: 0.25 });
    expect(container.querySelectorAll(".velo-pane-divider")).toHaveLength(2);

    stack.destroy();
    document.body.removeChild(container);
  });

  it("addPane appends a pane, hides the previous x-axis, and rebalances ratios", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      sharedXAxis: "bottom",
      panes: [
        { id: "price", height: 0.6 },
        { id: "vol", height: 0.4 },
      ],
    });

    const chart = stack.addPane({
      id: "extra",
      height: 0.25,
      series: [{ id: "e", type: "line", data: { x: Float32Array.from([0, 1]), y: Float32Array.from([1, 2]) } }],
    });
    expect(chart).toBeDefined();
    expect(stack.getPanes()).toHaveLength(3);
    expect(stack.getChart("extra")).toBe(chart);
    // previous last pane's x-axis is hidden so only the new bottom pane shows it
    const vol = stack.getPane("vol") as Record<string, ReturnType<typeof vi.fn>>;
    expect(vol.updateXAxis).toHaveBeenCalledWith({
      showLabels: false,
      showTicks: false,
      showLine: false,
    });
    expect(vol.updateLayout).toHaveBeenCalledWith({
      margins: { bottom: 0 },
    });
    // new bottom pane should request X labels (createChart options)
    const extraOpts = mockCreateChart.mock.calls.find((c) => c[0]?.id === "extra")?.[0];
    expect(extraOpts?.xAxis?.showLabels).toBe(true);

    stack.destroy();
    document.body.removeChild(container);
  });

  it("propagates stack-level xAxis defaults to every pane", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    createStackedChart({
      container,
      sharedXAxis: "bottom",
      xAxis: { type: "time", timeScale: { calendar: "business-day" } },
      panes: [
        { id: "price", height: 0.7 },
        { id: "rsi", height: 0.3 },
      ],
    });

    const priceOpts = mockCreateChart.mock.calls.find((c) => c[0]?.id === "price")?.[0];
    const rsiOpts = mockCreateChart.mock.calls.find((c) => c[0]?.id === "rsi")?.[0];
    expect(priceOpts?.xAxis).toMatchObject({
      type: "time",
      timeScale: { calendar: "business-day" },
      showLabels: false,
    });
    expect(rsiOpts?.xAxis).toMatchObject({
      type: "time",
      timeScale: { calendar: "business-day" },
      showLabels: true,
    });

    document.body.removeChild(container);
  });

  it("addPane rejects duplicates and enforces the pane limit", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      panes: [{ id: "a", height: 1 }],
    });

    expect(() => stack.addPane({ id: "a", height: 0.2 })).toThrow(/already exists/);

    // fill up to the maximum then overflow
    stack.addPane({ id: "b", height: 0.2 });
    stack.addPane({ id: "c", height: 0.2 });
    stack.addPane({ id: "d", height: 0.2 });
    stack.addPane({ id: "e", height: 0.2 });
    expect(stack.getPanes()).toHaveLength(5);
    expect(() => stack.addPane({ id: "f", height: 0.2 })).toThrow(/exceed/);

    stack.destroy();
    document.body.removeChild(container);
  });

  it("addPane on a horizontal stack keeps the first pane's y-axis", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.width = "640px";
    container.style.height = "320px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      direction: "horizontal",
      sharedYAxis: "left",
      panes: [{ id: "a", height: 0.5 }],
    });
    stack.addPane({ id: "b", height: 0.5 });
    expect(stack.getPanes()).toHaveLength(2);

    stack.destroy();
    document.body.removeChild(container);
  });

  it("export defaults to png and falls back to a white background", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "300px";
    document.body.appendChild(container);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const stack = createStackedChart({ container, panes: [{ id: "solo", height: 1 }] });
    // strip theme so getBackgroundColor uses the "#ffffff" fallback
    const master = stack.getMaster() as Record<string, unknown>;
    master.theme = undefined;
    master.baseTheme = undefined;

    await stack.exportImage({ download: true }); // no format → "png"
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
    stack.destroy();
    document.body.removeChild(container);
  });

  it("vertical stack honors explicit layout margins, gap, and non-shared X axis", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      gap: 8,
      sharedXAxis: "none", // every pane shows its own X axis
      layout: { margins: { top: 12, bottom: 40, left: 70, right: 30 } },
      panes: [
        {
          id: "a",
          height: 0.5,
          chart: { xAxis: { tickCount: 5 }, layout: { margins: { left: 80 } } },
        },
        { id: "b", height: 0.5 },
      ],
    });

    expect(stack.getPanes()).toHaveLength(2);
    stack.destroy();
    document.body.removeChild(container);
  });

  it("horizontal stack with gap, bottom margin, and non-shared Y axis", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.width = "640px";
    container.style.height = "320px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      direction: "horizontal",
      gap: 10,
      sharedYAxis: "none", // every pane shows its own Y axis
      sharedXAxis: "none",
      layout: { margins: { bottom: 44 } },
      panes: [
        { id: "a", height: 0.5 },
        { id: "b", height: 0.5 },
      ],
    });

    expect(container.style.flexDirection).toBe("row");
    stack.destroy();
    document.body.removeChild(container);
  });

  it("resizable without an explicit divider size uses the default", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      resizable: { minPaneRatio: 0.1 }, // no dividerSize → default 6
      panes: [
        { id: "a", height: 0.5 },
        { id: "b", height: 0.5 },
      ],
    });
    expect(container.querySelectorAll(".velo-pane-divider").length).toBe(1);
    stack.destroy();
    document.body.removeChild(container);
  });

  it("getSyncAxis falls back to x when the group reports no axis", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "300px";
    document.body.appendChild(container);
    const stack = createStackedChart({ container, panes: [{ id: "a", height: 1 }] });
    mockGroup.getOptions.mockReturnValueOnce({} as { axis?: "x" });
    expect(stack.getSyncAxis()).toBe("x");
    stack.destroy();
    document.body.removeChild(container);
  });

  it("addPane defaults height and respects non-shared axes", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      sharedXAxis: "none", // addPane keeps prior pane's X axis (no hide)
      panes: [{ id: "a", height: 0.6 }],
    });
    const chart = stack.addPane({ id: "b" }); // no height → default 0.25
    expect(chart).toBeDefined();
    expect(stack.getPanes()).toHaveLength(2);
    stack.destroy();
    document.body.removeChild(container);
  });

  it("addPane on a horizontal non-shared-Y stack", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.width = "640px";
    container.style.height = "320px";
    document.body.appendChild(container);
    const stack = createStackedChart({
      container,
      direction: "horizontal",
      sharedYAxis: "none",
      panes: [{ id: "a", height: 0.5 }],
    });
    stack.addPane({ id: "b", height: 0.5 });
    expect(stack.getPanes()).toHaveLength(2);
    stack.destroy();
    document.body.removeChild(container);
  });

  it("addIndicator overlays on the master chart and mounts new panes", async () => {
    const createStackedChart = await loadStack();
    const { addIndicatorToChart, buildIndicatorPaneFromPreset } = await import(
      "../indicator/addIndicator"
    );
    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      panes: [
        {
          id: "price",
          height: 1,
          series: [{ id: "l", type: "line", data: { x: Float32Array.from([0, 1]), y: Float32Array.from([1, 2]) } }],
        },
      ],
    });

    const overlay = await stack.addIndicator("rsi", {});
    expect(addIndicatorToChart).toHaveBeenCalled();
    expect(overlay.chart).toBe(stack.getMaster());

    const paneResult = await stack.addIndicator("macd", { pane: "new", id: "macdPane" });
    expect(buildIndicatorPaneFromPreset).toHaveBeenCalled();
    expect(paneResult.paneId).toBe("macdPane");
    expect(paneResult.seriesIds).toContain("macdPane-line");
    expect(stack.getPanes()).toHaveLength(2);

    // default id + label branch (opts.id / opts.label omitted)
    const paneResult2 = await stack.addIndicator("ema", { pane: "new" });
    expect(paneResult2.paneId).toBe("ema");

    stack.destroy();
    document.body.removeChild(container);
  });

  it("uses default layout margins when layout is omitted", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      panes: [
        { id: "a", height: 0.5, chart: { yAxis: { position: "left" } } },
        { id: "b", height: 0.5 },
      ],
    });

    expect(stack.getPanes()).toHaveLength(2);
    stack.destroy();
    document.body.removeChild(container);
  });

  it("skips stack resize RAF while pane drag is active", async () => {
    const queued: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      queued.push(cb);
      return queued.length;
    });

    let observerCb: ResizeObserverCallback | undefined;
    class TestResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        observerCb = cb;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", TestResizeObserver);

    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      resizable: true,
      panes: [
        { id: "a", height: 0.5 },
        { id: "b", height: 0.5 },
      ],
    });

    const divider = container.querySelector(".velo-pane-divider") as HTMLDivElement;
    divider.setPointerCapture = vi.fn();
    divider.releasePointerCapture = vi.fn();
    divider.dispatchEvent(
      new PointerEvent("pointerdown", { clientY: 150, bubbles: true, pointerId: 21 }),
    );
    observerCb?.([], {} as ResizeObserver);
    expect(queued.length).toBeGreaterThan(0);
    queued.shift()?.(0);

    divider.dispatchEvent(
      new PointerEvent("pointerup", { clientY: 150, bubbles: true, pointerId: 21 }),
    );

    stack.destroy();
    document.body.removeChild(container);
    vi.unstubAllGlobals();
  });

  it("addPane scales existing ratios when pane ratios sum to zero", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      panes: [
        { id: "a", height: 0.5 },
        { id: "b", height: 0.5 },
      ],
    });

    stack.setPaneRatios({ a: 0, b: 0 });
    stack.addPane({ id: "c", height: 0.25 });
    expect(stack.getPanes()).toHaveLength(3);

    stack.destroy();
    document.body.removeChild(container);
  });

  it("syncRatiosFromSizes ignores zero totals after drag end", async () => {
    const paneResize = await import("./paneResize");
    const normalizeSpy = vi.spyOn(paneResize, "normalizePaneHeights").mockReturnValue([0, 0]);

    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      resizable: true,
      panes: [
        { id: "a", height: 0.5 },
        { id: "b", height: 0.5 },
      ],
    });

    const divider = container.querySelector(".velo-pane-divider") as HTMLDivElement;
    divider.setPointerCapture = vi.fn();
    divider.releasePointerCapture = vi.fn();
    divider.dispatchEvent(
      new PointerEvent("pointerdown", { clientY: 150, bubbles: true, pointerId: 22 }),
    );
    divider.dispatchEvent(
      new PointerEvent("pointerup", { clientY: 150, bubbles: true, pointerId: 22 }),
    );

    expect(normalizeSpy).toHaveBeenCalled();
    normalizeSpy.mockRestore();
    stack.destroy();
    document.body.removeChild(container);
  });

  it("flushDragLayout no-ops when drag layout was cleared before RAF runs", async () => {
    const queued: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      queued.push(cb);
      return queued.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      resizable: true,
      panes: [
        { id: "a", height: 0.5 },
        { id: "b", height: 0.5 },
      ],
    });

    const divider = container.querySelector(".velo-pane-divider") as HTMLDivElement;
    divider.setPointerCapture = vi.fn();
    divider.releasePointerCapture = vi.fn();
    divider.dispatchEvent(
      new PointerEvent("pointerdown", { clientY: 150, bubbles: true, pointerId: 23 }),
    );
    divider.dispatchEvent(
      new PointerEvent("pointermove", { clientY: 170, bubbles: true, pointerId: 23 }),
    );
    expect(queued.length).toBeGreaterThan(0);
    divider.dispatchEvent(
      new PointerEvent("pointerup", { clientY: 170, bubbles: true, pointerId: 23 }),
    );
    queued.shift()?.(0);

    stack.destroy();
    document.body.removeChild(container);
    vi.unstubAllGlobals();
  });

  it("handles a horizontal drag with measured pane sizes and a gap", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 800, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    // Give every element a non-zero bounding box so initDragSizes sees sum > 0
    // and the horizontal gap branch in applyDragPaneSizes runs.
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        width: 380,
        height: 400,
        top: 0,
        left: 0,
        right: 380,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect);
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      direction: "horizontal",
      gap: 6,
      resizable: { dividerSize: 6 },
      panes: [
        { id: "a", height: 0.5 },
        { id: "b", height: 0.5 },
      ],
    });

    const divider = container.querySelector(".velo-pane-divider") as HTMLDivElement;
    divider.dispatchEvent(new PointerEvent("pointerdown", { clientX: 400, bubbles: true, pointerId: 3 }));
    divider.dispatchEvent(new PointerEvent("pointermove", { clientX: 440, bubbles: true, pointerId: 3 }));
    divider.dispatchEvent(new PointerEvent("pointerup", { clientX: 440, bubbles: true, pointerId: 3 }));

    expect(stack.getPanes()).toHaveLength(2);
    rectSpy.mockRestore();
    stack.destroy();
    document.body.removeChild(container);
  });

  it("destroy cancels pending animation frames", async () => {
    // rAF that queues without executing so timers stay pending until destroy.
    const queued: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      queued.push(cb);
      return queued.length;
    });
    const cancel = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancel);

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

    const stack = createStackedChart({ container, panes: [{ id: "a", height: 1 }] });
    observerCb?.([], {} as ResizeObserver); // schedules a resize raf that never runs
    stack.destroy();
    expect(cancel).toHaveBeenCalled();

    document.body.removeChild(container);
    vi.unstubAllGlobals();
  });

  it("skips stack resize while a pane drag is active", async () => {
    let observerCb: ResizeObserverCallback | undefined;
    class TestResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        observerCb = cb;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", TestResizeObserver);

    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      resizable: true,
      panes: [
        { id: "a", height: 0.5 },
        { id: "b", height: 0.5 },
      ],
    });

    const divider = container.querySelector(".velo-pane-divider") as HTMLDivElement;
    divider.dispatchEvent(
      new PointerEvent("pointerdown", { clientY: 150, bubbles: true, pointerId: 11 }),
    );
    observerCb?.([], {} as ResizeObserver);
    divider.dispatchEvent(
      new PointerEvent("pointerup", { clientY: 150, bubbles: true, pointerId: 11 }),
    );

    stack.destroy();
    document.body.removeChild(container);
    vi.unstubAllGlobals();
  });

  it("destroy cancels pending drag layout frames", async () => {
    const queued: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      queued.push(cb);
      return queued.length;
    });
    const cancel = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancel);

    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      resizable: true,
      panes: [
        { id: "a", height: 0.5 },
        { id: "b", height: 0.5 },
      ],
    });

    const divider = container.querySelector(".velo-pane-divider") as HTMLDivElement;
    divider.dispatchEvent(
      new PointerEvent("pointerdown", { clientY: 150, bubbles: true, pointerId: 12 }),
    );
    divider.dispatchEvent(
      new PointerEvent("pointermove", { clientY: 180, bubbles: true, pointerId: 12 }),
    );
    stack.destroy();
    expect(cancel).toHaveBeenCalled();

    document.body.removeChild(container);
    vi.unstubAllGlobals();
  });

  it("addIndicator new pane handles indicator config without series list", async () => {
    const createStackedChart = await loadStack();
    const { buildIndicatorPaneFromPreset } = await import("../indicator/addIndicator");
    vi.mocked(buildIndicatorPaneFromPreset).mockResolvedValueOnce({
      id: "emptyPane",
      height: 0.2,
      series: undefined,
    } as never);

    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      panes: [{ id: "price", height: 1, series: [{ id: "l", type: "line", data: { x: Float32Array.from([0]), y: Float32Array.from([1]) } }] }],
    });

    const paneResult = await stack.addIndicator("rsi", { pane: "new", id: "emptyPane" });
    expect(paneResult.seriesIds).toEqual([]);

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
