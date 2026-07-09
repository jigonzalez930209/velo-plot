import { describe, it, expect, vi } from "vitest";
import {
  diffSeries,
  veloPlotSeriesToOptions,
  serializePaneIds,
} from "./seriesDiff";
import { optionsChanged, syncChartOptions } from "./optionsSync";
import { buildAriaLabel } from "./a11y";
import { sampleLineData } from "../test-utils";

describe("seriesDiff", () => {
  it("adds new series", () => {
    const { x, y } = sampleLineData(5);
    const addSeries = vi.fn();
    const updateSeries = vi.fn();
    const removeSeries = vi.fn();
    const prev = new Map<string, import("./types").VeloPlotSeries>();

    diffSeries(
      { addSeries, updateSeries, removeSeries, autoScale: vi.fn() },
      [{ id: "a", x, y }],
      prev,
    );

    expect(addSeries).toHaveBeenCalledTimes(1);
    expect(removeSeries).not.toHaveBeenCalled();
  });

  it("removes missing series", () => {
    const { x, y } = sampleLineData(3);
    const removeSeries = vi.fn();
    const prev = new Map([
      ["a", { id: "a", x, y }],
      ["b", { id: "b", x, y }],
    ]);

    diffSeries(
      {
        addSeries: vi.fn(),
        updateSeries: vi.fn(),
        removeSeries,
      },
      [{ id: "a", x, y }],
      prev,
    );

    expect(removeSeries).toHaveBeenCalledWith("b");
  });

  it("maps candlestick to SeriesOptions", () => {
    const x = new Float32Array([0, 1]);
    const open = new Float32Array([10, 11]);
    const high = new Float32Array([12, 13]);
    const low = new Float32Array([9, 10]);
    const close = new Float32Array([11, 12]);

    const opts = veloPlotSeriesToOptions({
      id: "ohlc",
      type: "candlestick",
      x,
      open,
      high,
      low,
      close,
    });

    expect(opts.type).toBe("candlestick");
    expect(opts.data.close).toBe(close);
  });

  it("serializes pane ids", () => {
    expect(
      serializePaneIds([{ id: "price" }, { id: "volume" }]),
    ).toBe("price,volume");
  });

  it("updates series when data reference changes", () => {
    const { x, y } = sampleLineData(3);
    const y2 = new Float32Array([9, 8, 7]);
    const updateSeries = vi.fn();
    const prev = new Map([["a", { id: "a", x, y }]]);
    diffSeries(
      { addSeries: vi.fn(), updateSeries, removeSeries: vi.fn(), autoScale: vi.fn() },
      [{ id: "a", x, y: y2 }],
      prev,
    );
    expect(updateSeries).toHaveBeenCalledWith("a", { x, y: y2 });
  });

  it("autoScales when first single series is added", () => {
    const { x, y } = sampleLineData(2);
    const autoScale = vi.fn();
    diffSeries(
      { addSeries: vi.fn(), updateSeries: vi.fn(), removeSeries: vi.fn(), autoScale },
      [{ id: "only", x, y }],
      new Map(),
    );
    expect(autoScale).toHaveBeenCalled();
  });

  it("maps bar and heatmap to SeriesOptions", () => {
    const { x, y } = sampleLineData(2);
    expect(veloPlotSeriesToOptions({ id: "b", type: "bar", x, y }).type).toBe("bar");
    expect(
      veloPlotSeriesToOptions({
        id: "h",
        type: "heatmap",
        data: { xValues: [0], yValues: [0], zValues: new Float32Array([1]) },
      }).type,
    ).toBe("heatmap");
  });

  it("updates bar, candlestick, and heatmap series data", () => {
    const { x, y } = sampleLineData(3);
    const y2 = new Float32Array([1, 2, 3]);
    const updateSeries = vi.fn();
    const barPrev = new Map([["b", { id: "b", type: "bar" as const, x, y }]]);
    diffSeries(
      { addSeries: vi.fn(), updateSeries, removeSeries: vi.fn(), autoScale: vi.fn() },
      [{ id: "b", type: "bar", x, y: y2 }],
      barPrev,
    );
    expect(updateSeries).toHaveBeenCalled();

    const open = x;
    const close = y2;
    const candlePrev = new Map([
      ["c", { id: "c", type: "candlestick" as const, x, open, high: y, low: y, close: y }],
    ]);
    diffSeries(
      { addSeries: vi.fn(), updateSeries, removeSeries: vi.fn(), autoScale: vi.fn() },
      [{ id: "c", type: "candlestick", x, open, high: y, low: y, close }],
      candlePrev,
    );

    const heatPrev = new Map([
      [
        "h",
        {
          id: "h",
          type: "heatmap" as const,
          data: { xValues: [0], yValues: [0], zValues: new Float32Array([1]) },
        },
      ],
    ]);
    diffSeries(
      { addSeries: vi.fn(), updateSeries, removeSeries: vi.fn(), autoScale: vi.fn() },
      [
        {
          id: "h",
          type: "heatmap",
          data: { xValues: [0, 1], yValues: [0, 2], zValues: new Float32Array([1, 2]) },
        },
      ],
      heatPrev,
    );
    expect(updateSeries).toHaveBeenCalled();
  });

  it("detects heatmap xValues changes only", () => {
    const updateSeries = vi.fn();
    const z = new Float32Array([1, 2]);
    const yv = [0, 1];
    const prev = new Map([
      [
        "h",
        {
          id: "h",
          type: "heatmap" as const,
          data: { xValues: [0, 1], yValues: yv, zValues: z },
        },
      ],
    ]);
    diffSeries(
      { addSeries: vi.fn(), updateSeries, removeSeries: vi.fn(), autoScale: vi.fn() },
      [
        {
          id: "h",
          type: "heatmap",
          data: { xValues: [0, 2], yValues: yv, zValues: z },
        },
      ],
      prev,
    );
    expect(updateSeries).toHaveBeenCalled();
  });

  it("detects heatmap yValues changes only", () => {
    const updateSeries = vi.fn();
    const z = new Float32Array([1, 2]);
    const xv = [0, 1];
    const prev = new Map([
      [
        "h",
        {
          id: "h",
          type: "heatmap" as const,
          data: { xValues: xv, yValues: [0, 1], zValues: z },
        },
      ],
    ]);
    diffSeries(
      { addSeries: vi.fn(), updateSeries, removeSeries: vi.fn(), autoScale: vi.fn() },
      [
        {
          id: "h",
          type: "heatmap",
          data: { xValues: xv, yValues: [0, 2], zValues: z },
        },
      ],
      prev,
    );
    expect(updateSeries).toHaveBeenCalled();
  });

  it("detects heatmap axis value changes", () => {
    const updateSeries = vi.fn();
    const z = new Float32Array([1, 2]);
    const prev = new Map([
      [
        "h",
        {
          id: "h",
          type: "heatmap" as const,
          data: { xValues: [0, 1], yValues: [0, 1], zValues: z },
        },
      ],
    ]);
    diffSeries(
      { addSeries: vi.fn(), updateSeries, removeSeries: vi.fn(), autoScale: vi.fn() },
      [
        {
          id: "h",
          type: "heatmap",
          data: { xValues: [0, 2], yValues: [0, 3], zValues: z },
        },
      ],
      prev,
    );
    expect(updateSeries).toHaveBeenCalled();
  });

  it("detects type changes and unknown series shapes", () => {
    const { x, y } = sampleLineData(2);
    const addSeries = vi.fn();
    const updateSeries = vi.fn();
    const prev = new Map([["a", { id: "a", x, y }]]);
    diffSeries(
      { addSeries, updateSeries, removeSeries: vi.fn(), autoScale: vi.fn() },
      [{ id: "a", type: "bar", x, y }],
      prev,
    );
    expect(updateSeries).toHaveBeenCalled();
    diffSeries(
      { addSeries, updateSeries, removeSeries: vi.fn(), autoScale: vi.fn() },
      [{ id: "b" } as import("./types").VeloPlotSeries],
      new Map(),
    );
  });

  it("detects incompatible series payloads", () => {
    const updateSeries = vi.fn();
    const prev = new Map([["x", { id: "x", type: "line" as const }]]);
    diffSeries(
      { addSeries: vi.fn(), updateSeries, removeSeries: vi.fn(), autoScale: vi.fn() },
      [{ id: "x", type: "line" as const }],
      prev,
    );
    expect(updateSeries).toHaveBeenCalled();
  });

  it("treats unknown series shapes as changed", () => {
    const updateSeries = vi.fn();
    const { x, y } = sampleLineData(2);
    const prev = new Map([
      ["m", { id: "m", type: "line" as const, x, y }],
    ]);
    diffSeries(
      { addSeries: vi.fn(), updateSeries, removeSeries: vi.fn(), autoScale: vi.fn() },
      [{ id: "m", type: "line" as const } as import("./types").VeloPlotSeries],
      prev,
    );
    expect(updateSeries).toHaveBeenCalled();
  });
});

describe("optionsSync", () => {
  it("detects theme changes", () => {
    expect(
      optionsChanged({ theme: "dark" }, { theme: "light" }),
    ).toBe(true);
    expect(
      optionsChanged({ theme: "dark" }, { theme: "dark" }),
    ).toBe(false);
  });

  it("applies theme via setTheme", () => {
    const setTheme = vi.fn();
    const chart = { setTheme, updateXAxis: vi.fn(), updateYAxis: vi.fn(), resize: vi.fn() };
    syncChartOptions(
      chart as never,
      { theme: "dark" },
      { theme: "midnight" },
    );
    expect(setTheme).toHaveBeenCalledWith("midnight");
  });
});

describe("a11y", () => {
  it("builds descriptive aria label", () => {
    const label = buildAriaLabel(
      [{ id: "cv", name: "CV", x: new Float32Array(), y: new Float32Array() }],
      { xMin: 0, xMax: 1, yMin: -1, yMax: 1 },
    );
    expect(label).toContain("CV");
    expect(label).toContain("Visible range");
  });
});
