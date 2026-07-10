/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Chart } from "../chart/types";
import { Series } from "../Series";

const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function buildPriceSeries() {
  const n = 80;
  const x = Float32Array.from({ length: n }, (_, i) => i);
  const close = Float32Array.from({ length: n }, (_, i) => 100 + Math.sin(i * 0.1) * 5);
  return new Series({
    id: "candles",
    type: "candlestick",
    data: { x, y: close, open: close, high: close, low: close, close },
  });
}

function buildMockChart(id: string, withSeries = false): Chart & Record<string, ReturnType<typeof vi.fn>> {
  const priceSeries = withSeries ? buildPriceSeries() : undefined;
  return {
    getId: () => id,
    addSeries: vi.fn(),
    getSeries: vi.fn((sid: string) => (sid === "candles" ? priceSeries : undefined)),
    getAllSeries: vi.fn(() => (priceSeries ? [priceSeries] : [])),
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
    const chart = buildMockChart(opts.id, opts.id === "price" || opts.id === "rsi-pane");
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

describe("StackedChart.addIndicator (DOM)", () => {
  beforeEach(() => {
    mockCreateChart.mockClear();
    chartsById.clear();
    initQueueState.pending = 0;
  });

  async function loadStack() {
    const mod = await import("./createStackedChart");
    return mod.createStackedChart;
  }

  it("addPane appends a pane chart to the stack", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "400px";
    document.body.appendChild(container);

    const stack = createStackedChart({
      container,
      masterPaneId: "price",
      panes: [{ id: "price", height: 0.7, series: [] }],
    });

    expect(stack.getPanes()).toHaveLength(1);
    stack.addPane({ id: "extra", height: 0.3 });
    expect(stack.getPanes()).toHaveLength(2);
    expect(mockCreateChart).toHaveBeenCalledTimes(2);

    stack.destroy();
    document.body.removeChild(container);
  });

  it("addIndicator with pane:new mounts oscillator pane", async () => {
    const createStackedChart = await loadStack();
    const container = document.createElement("div");
    container.style.height = "500px";
    document.body.appendChild(container);

    const n = 80;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const close = Float32Array.from({ length: n }, (_, i) => 100 + Math.sin(i * 0.1) * 5);

    const stack = createStackedChart({
      container,
      masterPaneId: "price",
      panes: [
        {
          id: "price",
          height: 0.7,
          series: [{
            id: "candles",
            type: "candlestick",
            data: { x, y: close, open: close, high: close, low: close, close },
          }],
        },
      ],
    });

    const result = await stack.addIndicator("rsi", { period: 14, pane: "new", id: "rsi-pane" });
    expect(result.paneId).toBe("rsi-pane");
    expect(result.placement).toBe("oscillator");
    expect(stack.getPanes()).toHaveLength(2);
    expect(stack.getPane("rsi-pane")).toBeDefined();
    expect(mockCreateChart).toHaveBeenCalledTimes(2);

    stack.destroy();
    document.body.removeChild(container);
  });
});
