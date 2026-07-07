import { describe, it, expect, vi, beforeEach } from "vitest";
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

  beforeEach(() => {
    updates = [];
  });

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
      appendData: vi.fn(),
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
    updates.length = 0;
    chart.appendData("ohlc", [5000, 5001], [1, 2]);
    await new Promise((r) => setTimeout(r, 0));
    expect(updates.length).toBeGreaterThan(0);
    expect(candlestick.getData().x.length).toBeGreaterThan(5000);
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
    await new Promise((r) => setTimeout(r, 0));
    expect(updates.some((u) => u.id === "ohlc")).toBe(true);
  });

  it("updateConfig and getAllStats expose plugin state", async () => {
    const { plugin } = initPlugin();
    await new Promise((r) => setTimeout(r, 0));
    (plugin.api as any).updateConfig({ targetPoints: 25 });
    await new Promise((r) => setTimeout(r, 0));
    const all = (plugin.api as any).getAllStats();
    expect(all.length).toBeGreaterThan(0);
    expect((plugin.api as any).isEnabled()).toBe(true);
  });

  it("onDestroy restores chart methods", async () => {
    const { plugin, chart } = initPlugin();
    const original = chart.updateSeries;
    await new Promise((r) => setTimeout(r, 0));
    const ctx = { chart, data: { getAllSeries: () => [] }, events: { on: vi.fn() }, log: { info: vi.fn() } };
    plugin.onDestroy!(ctx as any);
    expect(chart.updateSeries).toBe(original);
  });
});
