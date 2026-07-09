import { describe, it, expect, vi } from "vitest";
import {
  stackedStructureKey,
  syncStackedTheme,
  syncStackedSyncOptions,
  syncStackedPaneSeries,
  syncStackedOptions,
} from "./stackedSync";
import { sampleLineData } from "../test-utils";

function mockStackedChart() {
  const panes = [{ setTheme: vi.fn() }, { setTheme: vi.fn() }];
  const paneChart = {
    addSeries: vi.fn(),
    updateSeries: vi.fn(),
    removeSeries: vi.fn(),
    autoScale: vi.fn(),
    getAllSeries: vi.fn(() => []),
    setTheme: vi.fn(),
  };
  return {
    getPanes: vi.fn(() => panes),
    getPane: vi.fn(() => paneChart),
    setSyncAxis: vi.fn(),
    setSyncOptions: vi.fn(),
    resize: vi.fn(),
    _paneChart: paneChart,
  };
}

describe("stackedSync", () => {
  it("stackedStructureKey encodes pane layout", () => {
    expect(
      stackedStructureKey([
        { id: "a", height: 0.7, showXAxis: true, showYAxis: false },
        { id: "b", height: 0.3 },
      ]),
    ).toContain("a:0.7:true:false");
  });

  it("syncStackedTheme applies theme to panes", () => {
    const stack = mockStackedChart();
    syncStackedTheme(stack as never, "dark");
    expect(stack.getPanes()[0].setTheme).toHaveBeenCalledWith("dark");
    syncStackedTheme(stack as never, undefined);
  });

  it("syncStackedSyncOptions handles false, object, and default", () => {
    const stack = mockStackedChart();
    syncStackedSyncOptions(stack as never, false);
    expect(stack.setSyncAxis).toHaveBeenCalledWith("none");

    syncStackedSyncOptions(stack as never, { axis: "x" });
    expect(stack.setSyncOptions).toHaveBeenCalledWith({ axis: "x" });

    stack.setSyncOptions.mockClear();
    syncStackedSyncOptions(stack as never, true);
    expect(stack.setSyncOptions).not.toHaveBeenCalled();
  });

  it("syncStackedPaneSeries maps series types and bootstraps first mount", () => {
    const stack = mockStackedChart();
    const { x, y } = sampleLineData(4);
    const open = x;
    const high = y;
    const low = y;
    const close = y;

    const next = syncStackedPaneSeries(
      stack as never,
      [
        {
          id: "price",
          height: 1,
          series: [
            { id: "line", type: "line", data: { x, y } },
            {
              id: "ohlc",
              type: "candlestick",
              data: { x, open, high, low, close },
            },
            { id: "bars", type: "bar", data: { x, y } },
            {
              id: "heat",
              type: "heatmap",
              data: {
                xValues: [0, 1],
                yValues: [0, 1],
                zValues: new Float32Array([1, 2]),
              },
            },
          ],
        },
        { id: "empty", height: 0.2, series: [] },
      ],
      new Map(),
    );

    expect(stack._paneChart.addSeries).toHaveBeenCalled();
    expect(next.get("price")?.size).toBe(4);
    expect(next.get("empty")?.size).toBe(0);
  });

  it("syncStackedPaneSeries updates and removes series", () => {
    const stack = mockStackedChart();
    const { x, y } = sampleLineData(3);
    const prev = new Map([
      [
        "p",
        new Map([["a", { id: "a", x, y }], ["b", { id: "b", x, y }]]),
      ],
    ]);
    const nextY = new Float32Array([9, 8, 7]);
    syncStackedPaneSeries(
      stack as never,
      [{ id: "p", height: 1, series: [{ id: "a", type: "line", data: { x, y: nextY } }] }],
      prev,
    );
    expect(stack._paneChart.updateSeries).toHaveBeenCalledWith("a", {
      x,
      y: nextY,
    });
    expect(stack._paneChart.removeSeries).toHaveBeenCalledWith("b");
  });

  it("syncStackedOptions syncs theme, sync, and gap resize", () => {
    const stack = mockStackedChart();
    syncStackedOptions(stack as never, {
      theme: "light",
      sync: false,
      gap: 8,
    });
    expect(stack.resize).toHaveBeenCalled();
  });

  it("syncStackedPaneSeries skips missing pane chart", () => {
    const stack = mockStackedChart();
    stack.getPane.mockReturnValueOnce(null);
    const next = syncStackedPaneSeries(
      stack as never,
      [{ id: "missing", height: 1, series: [{ id: "l", type: "line", data: { x: new Float32Array(), y: new Float32Array() } }] }],
      new Map(),
    );
    expect(next.get("missing")?.size).toBe(0);
  });

  it("bootstraps series on first mount when pane chart is empty", () => {
    const stack = mockStackedChart();
    const { x, y } = sampleLineData(2);
    stack._paneChart.getAllSeries.mockReturnValue([]);
    syncStackedPaneSeries(
      stack as never,
      [{ id: "p", height: 1, series: [{ id: "line1", type: "line", data: { x, y } }] }],
      new Map(),
    );
    expect(stack._paneChart.addSeries).toHaveBeenCalled();
  });

  it("maps line series without explicit type", () => {
    const stack = mockStackedChart();
    const { x, y } = sampleLineData(2);
    syncStackedPaneSeries(
      stack as never,
      [{ id: "p", height: 1, series: [{ id: "plain", data: { x, y }, name: "Plain" }] }],
      new Map([["p", new Map()]]),
    );
    expect(stack._paneChart.addSeries).toHaveBeenCalled();
  });

  it("bootstraps pane series when chart has no matching ids", () => {
    const stack = mockStackedChart();
    const { x, y } = sampleLineData(2);
    stack._paneChart.getAllSeries.mockReturnValue([]);
    syncStackedPaneSeries(
      stack as never,
      [{ id: "p", height: 1, series: [{ id: "line1", type: "line", data: { x, y } }] }],
      new Map([["p", new Map()]]),
    );
    expect(stack._paneChart.addSeries).toHaveBeenCalled();
  });

  it("maps candlestick and bar series without optional style fields", () => {
    const stack = mockStackedChart();
    const { x, y } = sampleLineData(2);
    syncStackedPaneSeries(
      stack as never,
      [
        {
          id: "p",
          height: 1,
          series: [
            {
              id: "c",
              type: "candlestick",
              data: { x, open: y, high: y, low: y, close: y },
            },
            { id: "b", type: "bar", data: { x, y } },
          ],
        },
      ],
      new Map(),
    );
    expect(stack._paneChart.addSeries).toHaveBeenCalled();
  });

  it("syncStackedOptions skips resize when gap is undefined", () => {
    const stack = mockStackedChart();
    syncStackedOptions(stack as never, { theme: "dark" });
    expect(stack.resize).not.toHaveBeenCalled();
  });

  it("maps bar series with optional style width", () => {
    const stack = mockStackedChart();
    const { x, y } = sampleLineData(2);
    syncStackedPaneSeries(
      stack as never,
      [
        {
          id: "p",
          height: 1,
          series: [
            {
              id: "b",
              type: "bar",
              data: { x, y },
              style: { width: 2 },
            },
          ],
        },
      ],
      new Map(),
    );
    expect(stack._paneChart.addSeries).toHaveBeenCalled();
  });

  it("maps heatmap series with optional color", () => {
    const stack = mockStackedChart();
    syncStackedPaneSeries(
      stack as never,
      [
        {
          id: "p",
          height: 1,
          series: [
            {
              id: "heat",
              type: "heatmap",
              data: {
                xValues: [0, 1],
                yValues: [0, 1],
                zValues: new Float32Array([1, 2, 3, 4]),
              },
              style: { color: "#abc" },
            },
          ],
        },
      ],
      new Map(),
    );
    expect(stack._paneChart.addSeries).toHaveBeenCalled();
  });

  it("maps series style and visibility metadata", () => {
    const stack = mockStackedChart();
    const { x, y } = sampleLineData(2);
    syncStackedPaneSeries(
      stack as never,
      [
        {
          id: "p",
          height: 1,
          series: [
            {
              id: "line",
              type: "line",
              data: { x, y },
              name: "Line",
              visible: false,
              style: { color: "#f00", width: 2 },
            },
            {
              id: "c",
              type: "candlestick",
              data: { x, open: y, high: y, low: y, close: y },
              style: { color: "#0f0", width: 1 },
              visible: true,
              name: "Candles",
            },
          ],
        },
      ],
      new Map(),
    );
    expect(stack._paneChart.addSeries).toHaveBeenCalled();
  });

  it("maps heatmap series in stacked panes", () => {
    const stack = mockStackedChart();
    syncStackedPaneSeries(
      stack as never,
      [
        {
          id: "p",
          height: 1,
          series: [
            {
              id: "heat",
              type: "heatmap",
              data: {
                xValues: [0, 1],
                yValues: [0, 1],
                zValues: new Float32Array([1, 2, 3, 4]),
              },
            },
          ],
        },
      ],
      new Map(),
    );
    expect(stack._paneChart.addSeries).toHaveBeenCalled();
  });

  it("skips panes with empty series arrays", () => {
    const stack = mockStackedChart();
    const next = syncStackedPaneSeries(
      stack as never,
      [{ id: "empty", height: 0.2, series: [] }],
      new Map(),
    );
    expect(next.get("empty")?.size).toBe(0);
    expect(stack._paneChart.addSeries).not.toHaveBeenCalled();
  });
});
