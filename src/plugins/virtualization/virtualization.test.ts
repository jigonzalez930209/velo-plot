import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PluginVirtualization } from "./index";
import { Series } from "../../core/series/Series";
import type { PluginContext } from "../types";

function makeOhlc(n: number) {
  const x = Float32Array.from({ length: n }, (_, i) => i);
  const open = Float32Array.from({ length: n }, (_, i) => i);
  const high = Float32Array.from({ length: n }, (_, i) => i + 2);
  const low = Float32Array.from({ length: n }, (_, i) => i - 1);
  const close = Float32Array.from({ length: n }, (_, i) => i + 1);
  return { x, open, high, low, close };
}

describe("PluginVirtualization", () => {
  let updates: Array<Record<string, unknown>>;
  let rafCallbacks: FrameRequestCallback[] = [];

  beforeEach(() => {
    updates = [];
    rafCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function flushRaf() {
    const pending = [...rafCallbacks];
    rafCallbacks = [];
    pending.forEach((cb) => cb(0));
  }

  function initPlugin(canvasWidth = 800) {
    const plugin = PluginVirtualization({ targetPoints: 50, debug: false });
    const candlestick = new Series({
      id: "ohlc",
      type: "candlestick",
      data: makeOhlc(5000),
    });
    const bar = new Series({
      id: "bars",
      type: "bar",
      data: {
        x: Float32Array.from({ length: 5000 }, (_, i) => i),
        y: Float32Array.from({ length: 5000 }, (_, i) => Math.sin(i * 0.01) * 100),
      },
    });

    const chart = {
      getSeries: (id: string) => (id === "ohlc" ? candlestick : id === "bars" ? bar : undefined),
      updateSeries: vi.fn((id: string, data: Record<string, unknown>) => {
        updates.push({ id, ...data });
        if (id === "ohlc") candlestick.updateData(data as any);
        if (id === "bars") bar.updateData(data as any);
      }),
      appendData: vi.fn((id: string, x: number[] | Float32Array, y: number[] | Float32Array) => {
        const s = id === "ohlc" ? candlestick : id === "bars" ? bar : undefined;
        s?.updateData({ x: x as any, y: y as any, append: true });
      }),
      on: vi.fn(),
    };

    const ctx = {
      chart,
      data: {
        getAllSeries: () => [candlestick, bar],
        getViewBounds: () => ({ xMin: 0, xMax: 5000, yMin: -100, yMax: 100 }),
      },
      render: { canvasSize: { width: canvasWidth, height: 400 }, pixelRatio: 1 },
      events: { on: vi.fn() },
      log: { info: vi.fn() },
    } as unknown as PluginContext;

    plugin.onInit!(ctx);
    return { plugin, chart, candlestick, bar };
  }

  it("downsamples candlestick OHLC to target budget", async () => {
    initPlugin();
    await new Promise((r) => setTimeout(r, 0));
    const ohlcUpdate = updates.find((u) => u.id === "ohlc");
    expect(ohlcUpdate).toBeDefined();
    expect((ohlcUpdate!.x as Float32Array).length).toBeLessThanOrEqual(50);
    expect(ohlcUpdate!.open).toBeDefined();
    expect(ohlcUpdate!.high).toBeDefined();
    expect(ohlcUpdate!.low).toBeDefined();
    expect(ohlcUpdate!.close).toBeDefined();
  });

  it("downsamples bar series", async () => {
    initPlugin();
    await new Promise((r) => setTimeout(r, 0));
    const barUpdate = updates.find((u) => u.id === "bars");
    expect(barUpdate).toBeDefined();
    expect((barUpdate!.x as Float32Array).length).toBeLessThanOrEqual(50);
  });

  it("reports virtualization stats", async () => {
    const { plugin } = initPlugin();
    await new Promise((r) => setTimeout(r, 0));
    const stats = (plugin.api as any).getStats("ohlc");
    expect(stats.originalPoints).toBe(5000);
    expect(stats.renderedPoints).toBeLessThanOrEqual(50);
  });

  it("restores original data when disabled", async () => {
    const { plugin } = initPlugin();
    await new Promise((r) => setTimeout(r, 0));
    (plugin.api as any).disable();
    const lastOhlc = updates.filter((u) => u.id === "ohlc").at(-1);
    expect((lastOhlc!.x as Float32Array).length).toBe(5000);
  });

  it("preserves full-resolution cache across refresh", async () => {
    const { plugin, candlestick } = initPlugin();
    await new Promise((r) => setTimeout(r, 0));
    (plugin.api as any).invalidate("ohlc");
    await new Promise((r) => setTimeout(r, 0));
    const stats = (plugin.api as any).getStats("ohlc");
    expect(stats.originalPoints).toBe(5000);
    expect(candlestick.getData().x.length).toBeLessThanOrEqual(50);
  });

  it("skips downsampling when precision is full", () => {
    const plugin = PluginVirtualization({ targetPoints: 50, precision: "full" });
    const candlestick = new Series({
      id: "ohlc",
      type: "candlestick",
      data: makeOhlc(5000),
    });
    const updateSeries = vi.fn();
    const chart = {
      getSeries: (id: string) => (id === "ohlc" ? candlestick : undefined),
      updateSeries,
      appendData: vi.fn(),
      on: vi.fn(),
    };
    const ctx = {
      chart,
      data: {
        getAllSeries: () => [candlestick],
        getViewBounds: () => ({ xMin: 0, xMax: 5000, yMin: -100, yMax: 100 }),
      },
      render: { canvasSize: { width: 800, height: 400 }, pixelRatio: 1 },
      events: { on: vi.fn() },
      log: { info: vi.fn() },
    } as unknown as PluginContext;
    plugin.onInit!(ctx);
    expect(updateSeries).not.toHaveBeenCalled();
    expect(candlestick.getData().x.length).toBe(5000);
  });

  it("hooks appendData and downsamples appended points", async () => {
    const { plugin, chart, candlestick } = initPlugin();
    await new Promise((r) => setTimeout(r, 0));
    const before = (plugin.api as any).getStats("ohlc").originalPoints;
    chart.appendData("ohlc", [5000, 5001], [1, 2]);
    flushRaf();
    await new Promise((r) => setTimeout(r, 0));
    const after = (plugin.api as any).getStats("ohlc").originalPoints;
    expect(after).toBeGreaterThan(before);
    expect(candlestick.getData().x.length).toBeLessThanOrEqual(50);
  });

  it("refresh on zoom event re-applies virtualization", async () => {
    const zoomHandlers: Array<() => void> = [];
    const plugin = PluginVirtualization({ targetPoints: 30, debug: false });
    const candlestick = new Series({ id: "ohlc", type: "candlestick", data: makeOhlc(3000) });
    const chart = {
      getSeries: (id: string) => (id === "ohlc" ? candlestick : undefined),
      updateSeries: vi.fn((id: string, data: Record<string, unknown>) => {
        updates.push({ id, ...data });
        candlestick.updateData(data as any);
      }),
      appendData: vi.fn(),
      on: vi.fn(),
    };
    const ctx = {
      chart,
      data: {
        getAllSeries: () => [candlestick],
        getViewBounds: () => ({ xMin: 0, xMax: 3000, yMin: -10, yMax: 10 }),
      },
      render: { canvasSize: { width: 400, height: 300 }, pixelRatio: 1 },
      events: {
        on: vi.fn((ev: string, cb: () => void) => {
          if (ev === "zoom") zoomHandlers.push(cb);
        }),
      },
      log: { info: vi.fn() },
    } as unknown as PluginContext;
    plugin.onInit!(ctx);
    await new Promise((r) => setTimeout(r, 0));
    updates.length = 0;
    zoomHandlers.forEach((h) => h());
    flushRaf();
    await new Promise((r) => setTimeout(r, 0));
    expect(updates.some((u) => u.id === "ohlc")).toBe(true);
  });

  it("updateConfig and getAllStats expose plugin state", async () => {
    const { plugin } = initPlugin();
    await new Promise((r) => setTimeout(r, 0));
    (plugin.api as any).updateConfig({ targetPoints: 25 });
    flushRaf();
    await new Promise((r) => setTimeout(r, 0));
    const all = (plugin.api as any).getAllStats();
    expect(all.length).toBeGreaterThan(0);
    expect((plugin.api as any).isEnabled()).toBe(true);
  });

  it("onDestroy restores chart methods", async () => {
    let updateCalls = 0;
    let appendCalls = 0;
    const updateSeries = () => {
      updateCalls += 1;
    };
    const appendData = () => {
      appendCalls += 1;
    };
    const candlestick = new Series({ id: "ohlc", type: "candlestick", data: makeOhlc(100) });
    const chart = {
      getSeries: () => candlestick,
      updateSeries,
      appendData,
      on: vi.fn(),
    };
    const plugin = PluginVirtualization({ targetPoints: 50 });
    const ctx = {
      chart,
      data: {
        getAllSeries: () => [candlestick],
        getViewBounds: () => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 10 }),
      },
      render: { canvasSize: { width: 400, height: 300 }, pixelRatio: 1 },
      events: { on: vi.fn() },
      log: { info: vi.fn() },
    } as unknown as PluginContext;
    plugin.onInit!(ctx);
    await new Promise((r) => setTimeout(r, 0));
    const wrappedUpdate = chart.updateSeries;
    const wrappedAppend = chart.appendData;
    updateCalls = 0;
    appendCalls = 0;
    plugin.onDestroy!(ctx);
    expect(chart.updateSeries).not.toBe(wrappedUpdate);
    expect(chart.appendData).not.toBe(wrappedAppend);
    chart.updateSeries();
    chart.appendData();
    expect(updateCalls).toBe(1);
    expect(appendCalls).toBe(1);
  });

  it("respects includeSeries and excludeSeries filters", async () => {
    const plugin = PluginVirtualization({
      targetPoints: 30,
      includeSeries: ["only"],
      excludeSeries: ["skip"],
    });
    const included = new Series({ id: "only", type: "line", data: { x: Float32Array.from({ length: 3000 }, (_, i) => i), y: Float32Array.from({ length: 3000 }, (_, i) => i) } });
    const excluded = new Series({ id: "skip", type: "line", data: { x: Float32Array.from({ length: 3000 }, (_, i) => i), y: Float32Array.from({ length: 3000 }, (_, i) => i) } });
    const updates: string[] = [];
    const chart = {
      getSeries: (id: string) => (id === "only" ? included : id === "skip" ? excluded : undefined),
      updateSeries: vi.fn((id: string) => updates.push(id)),
      appendData: vi.fn(),
      on: vi.fn(),
    };
    const ctx = {
      chart,
      data: {
        getAllSeries: () => [included, excluded],
        getViewBounds: () => ({ xMin: 0, xMax: 3000, yMin: 0, yMax: 3000 }),
      },
      render: { canvasSize: { width: 400, height: 300 }, pixelRatio: 1 },
      events: { on: vi.fn() },
      log: { info: vi.fn() },
    } as unknown as PluginContext;
    plugin.onInit!(ctx);
    await new Promise((r) => setTimeout(r, 0));
    expect(updates).toContain("only");
    expect(updates).not.toContain("skip");
  });

  it("uses minmax strategy for bar series and worker path for large line data", async () => {
    const plugin = PluginVirtualization({
      targetPoints: 40,
      strategy: "lttb",
      useWorker: true,
      workerThreshold: 1000,
    });
    const bar = new Series({
      id: "bars",
      type: "bar",
      data: {
        x: Float32Array.from({ length: 2000 }, (_, i) => i),
        y: Float32Array.from({ length: 2000 }, (_, i) => (i % 2 ? 5 : -5)),
      },
    });
    const line = new Series({
      id: "line",
      type: "line",
      data: {
        x: Float32Array.from({ length: 3000 }, (_, i) => i),
        y: Float32Array.from({ length: 3000 }, (_, i) => Math.sin(i * 0.01)),
      },
    });
    const chart = {
      getSeries: (id: string) => (id === "bars" ? bar : id === "line" ? line : undefined),
      updateSeries: vi.fn((id: string, data: Record<string, unknown>) => {
        if (id === "bars") bar.updateData(data as any);
        if (id === "line") line.updateData(data as any);
      }),
      appendData: vi.fn(),
      on: vi.fn(),
    };
    const ctx = {
      chart,
      data: {
        getAllSeries: () => [bar, line],
        getViewBounds: () => ({ xMin: 0, xMax: 3000, yMin: -10, yMax: 10 }),
      },
      render: { canvasSize: { width: 500, height: 300 }, pixelRatio: 1 },
      events: { on: vi.fn() },
      log: { info: vi.fn() },
    } as unknown as PluginContext;
    plugin.onInit!(ctx);
    await new Promise((r) => setTimeout(r, 50));
    expect(bar.getData().x.length).toBeLessThanOrEqual(40);
    expect(line.getData().x.length).toBeLessThanOrEqual(40);
    const barStats = (plugin.api as any).getStats("bars");
    expect(barStats.strategy).toBe("minmax");
  });

  it("enable/disable and invalidate refresh series data", async () => {
    const { plugin, candlestick } = initPlugin();
    await new Promise((r) => setTimeout(r, 0));
    (plugin.api as any).disable();
    await new Promise((r) => setTimeout(r, 0));
    expect(candlestick.getData().x.length).toBe(5000);
    (plugin.api as any).enable();
    flushRaf();
    await new Promise((r) => setTimeout(r, 0));
    expect(candlestick.getData().x.length).toBeLessThanOrEqual(50);
    (plugin.api as any).invalidate("ohlc");
    await new Promise((r) => setTimeout(r, 0));
    expect((plugin.api as any).getStats("ohlc")).toBeTruthy();
  });

  it("updateSeries hook re-virtualizes after external updates", async () => {
    const { plugin, chart, candlestick } = initPlugin();
    await new Promise((r) => setTimeout(r, 0));
    const big = makeOhlc(6000);
    chart.updateSeries("ohlc", big);
    await new Promise((r) => setTimeout(r, 0));
    expect(candlestick.getData().x.length).toBeLessThanOrEqual(50);
  });

  it("resize event triggers refresh when view changes", async () => {
    const resizeHandlers: Array<() => void> = [];
    const { plugin } = initPlugin();
    await new Promise((r) => setTimeout(r, 0));
    const ctxEvents = { on: vi.fn((ev: string, cb: () => void) => { if (ev === "resize") resizeHandlers.push(cb); }) };
    // re-init with resize hook
    const plugin2 = PluginVirtualization({ targetPoints: 40 });
    const candlestick = new Series({ id: "ohlc", type: "candlestick", data: makeOhlc(3000) });
    const chart = {
      getSeries: () => candlestick,
      updateSeries: vi.fn((_, d) => candlestick.updateData(d as any)),
      appendData: vi.fn(),
      on: vi.fn(),
    };
    plugin2.onInit!({
      chart,
      data: {
        getAllSeries: () => [candlestick],
        getViewBounds: () => ({ xMin: 0, xMax: 3000, yMin: 0, yMax: 10 }),
      },
      render: { canvasSize: { width: 300, height: 200 }, pixelRatio: 1 },
      events: ctxEvents,
      log: { info: vi.fn() },
    } as unknown as PluginContext);
    await new Promise((r) => setTimeout(r, 0));
    resizeHandlers.forEach((h) => h());
    flushRaf();
    await new Promise((r) => setTimeout(r, 0));
    expect((plugin2.api as any).getStats("ohlc")).toBeTruthy();
  });

  it("virtualizes scatter and step series types", async () => {
    const plugin = PluginVirtualization({ targetPoints: 20 });
    const scatter = new Series({
      id: "pts",
      type: "scatter",
      data: {
        x: Float32Array.from({ length: 1000 }, (_, i) => i),
        y: Float32Array.from({ length: 1000 }, (_, i) => i % 7),
      },
    });
    const chart = {
      getSeries: () => scatter,
      updateSeries: vi.fn((_, d) => scatter.updateData(d as any)),
      appendData: vi.fn(),
      on: vi.fn(),
    };
    plugin.onInit!({
      chart,
      data: {
        getAllSeries: () => [scatter],
        getViewBounds: () => ({ xMin: 0, xMax: 1000, yMin: 0, yMax: 10 }),
      },
      render: { canvasSize: { width: 200, height: 200 }, pixelRatio: 1 },
      events: { on: vi.fn() },
      log: { info: vi.fn() },
    } as unknown as PluginContext);
    await new Promise((r) => setTimeout(r, 0));
    expect(scatter.getData().x.length).toBeLessThanOrEqual(20);
  });

  it("uses minmax strategy and viewport slice when zoomed", async () => {
    const plugin = PluginVirtualization({ targetPoints: 40, strategy: "minmax", viewportBuffer: 0.1 });
    const line = new Series({
      id: "line",
      type: "line",
      data: {
        x: Float32Array.from({ length: 5000 }, (_, i) => i),
        y: Float32Array.from({ length: 5000 }, (_, i) => Math.sin(i * 0.02)),
      },
    });
    const chart = {
      getSeries: () => line,
      updateSeries: vi.fn((_, d) => line.updateData(d as any)),
      appendData: vi.fn(),
      on: vi.fn(),
    };
    plugin.onInit!({
      chart,
      data: {
        getAllSeries: () => [line],
        getViewBounds: () => ({ xMin: 2000, xMax: 2600, yMin: -1, yMax: 1 }),
      },
      render: { canvasSize: { width: 400, height: 300 }, pixelRatio: 1 },
      events: { on: vi.fn() },
      log: { info: vi.fn() },
    } as unknown as PluginContext);
    await new Promise((r) => setTimeout(r, 0));
    const stats = (plugin.api as any).getStats("line");
    expect(stats.strategy).toBe("minmax");
    expect(line.getData().x.length).toBeLessThanOrEqual(40);
  });

  it("skips downsampling when point count is below target", async () => {
    const plugin = PluginVirtualization({ targetPoints: 100 });
    const line = new Series({
      id: "tiny",
      type: "line",
      data: { x: Float32Array.from([0, 1, 2]), y: Float32Array.from([1, 2, 3]) },
    });
    const chart = {
      getSeries: () => line,
      updateSeries: vi.fn(),
      appendData: vi.fn(),
      on: vi.fn(),
    };
    plugin.onInit!({
      chart,
      data: {
        getAllSeries: () => [line],
        getViewBounds: () => ({ xMin: 0, xMax: 2, yMin: 0, yMax: 3 }),
      },
      render: { canvasSize: { width: 400, height: 300 }, pixelRatio: 1 },
      events: { on: vi.fn() },
      log: { info: vi.fn() },
    } as unknown as PluginContext);
    await new Promise((r) => setTimeout(r, 0));
    expect(line.getData().x.length).toBe(3);
  });

  it("logs debug messages when enabled", async () => {
    const log = vi.fn();
    const plugin = PluginVirtualization({ targetPoints: 20, debug: true });
    const line = new Series({
      id: "line",
      type: "line",
      data: { x: Float32Array.from({ length: 500 }, (_, i) => i), y: Float32Array.from({ length: 500 }, (_, i) => i) },
    });
    plugin.onInit!({
      chart: {
        getSeries: () => line,
        updateSeries: vi.fn((_, d) => line.updateData(d as any)),
        appendData: vi.fn(),
        on: vi.fn(),
      },
      data: {
        getAllSeries: () => [line],
        getViewBounds: () => ({ xMin: 0, xMax: 500, yMin: 0, yMax: 500 }),
      },
      render: { canvasSize: { width: 200, height: 200 }, pixelRatio: 1 },
      events: { on: vi.fn() },
      log: { info: log },
    } as unknown as PluginContext);
    await new Promise((r) => setTimeout(r, 0));
    expect(log).toHaveBeenCalled();
  });

  it("does not virtualize heatmap series", async () => {
    const heatmap = new Series({
      id: "hm",
      type: "heatmap",
      data: { x: Float32Array.from([0, 1]), y: Float32Array.from([0, 1]), z: Float32Array.from([1, 2]) },
    } as any);
    const updateSeries = vi.fn();
    const plugin = PluginVirtualization({ targetPoints: 10 });
    plugin.onInit!({
      chart: { getSeries: () => heatmap, updateSeries, appendData: vi.fn(), on: vi.fn() },
      data: {
        getAllSeries: () => [heatmap],
        getViewBounds: () => ({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }),
      },
      render: { canvasSize: { width: 200, height: 200 }, pixelRatio: 1 },
      events: { on: vi.fn() },
      log: { info: vi.fn() },
    } as unknown as PluginContext);
    await new Promise((r) => setTimeout(r, 0));
    expect(updateSeries).not.toHaveBeenCalled();
  });

  it("pan event schedules refresh like zoom", async () => {
    const panHandlers: Array<() => void> = [];
    const { plugin, candlestick } = initPlugin();
    await new Promise((r) => setTimeout(r, 0));
    const ctx = {
      chart: {
        getSeries: (id: string) => (id === "ohlc" ? candlestick : undefined),
        updateSeries: vi.fn((_, d) => candlestick.updateData(d as any)),
        appendData: vi.fn(),
        on: vi.fn(),
      },
      data: {
        getAllSeries: () => [candlestick],
        getViewBounds: () => ({ xMin: 100, xMax: 4000, yMin: -10, yMax: 10 }),
      },
      render: { canvasSize: { width: 400, height: 300 }, pixelRatio: 1 },
      events: {
        on: vi.fn((ev: string, cb: () => void) => {
          if (ev === "pan") panHandlers.push(cb);
        }),
      },
      log: { info: vi.fn() },
    } as unknown as PluginContext;
    plugin.onInit!(ctx);
    await new Promise((r) => setTimeout(r, 0));
    panHandlers.forEach((h) => h());
    flushRaf();
    await new Promise((r) => setTimeout(r, 0));
    expect((plugin.api as any).getStats("ohlc")).toBeTruthy();
  });
});
