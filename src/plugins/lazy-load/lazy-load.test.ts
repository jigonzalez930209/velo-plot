import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PluginLazyLoad } from "./index";
import type { DataChunk, DataProvider } from "./types";
import type { PluginContext } from "../types";

function makeProvider(total: number): DataProvider {
  return {
    getTotalCount: () => total,
    loadChunk: async (startIndex, endIndex): Promise<DataChunk> => ({
      startIndex,
      endIndex,
      x: Float32Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i),
      y: Float32Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i),
      loadedAt: Date.now(),
    }),
  };
}

describe("PluginLazyLoad", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("setDataWindow loads requested range", async () => {
    const plugin = PluginLazyLoad({ chunkSize: 1000, autoLoad: false, debug: false });
    const updateSeries = vi.fn();

    const ctx = {
      chart: { updateSeries, on: vi.fn() },
      data: {
        getViewBounds: () => ({ xMin: 0, xMax: 1000, yMin: 0, yMax: 100 }),
      },
    } as unknown as PluginContext;

    plugin.onInit!(ctx);
    (ctx.chart as any).lazyLoad.registerSeries("s1", makeProvider(100_000));

    await (ctx.chart as any).setDataWindow({ from: 5000, to: 8000, buffer: 0.5 });

    const status = (ctx.chart as any).lazyLoad.getLoadingStatus("s1");
    expect(status.loadedPoints).toBeGreaterThan(0);
    expect(updateSeries).toHaveBeenCalled();
  });

  it("unloadDistant removes chunks outside threshold", async () => {
    const plugin = PluginLazyLoad({
      chunkSize: 1000,
      autoLoad: false,
      autoUnload: true,
      viewportBuffer: 0.1,
      unloadThreshold: 0.5,
      debug: false,
    });
    const updateSeries = vi.fn();

    const ctx = {
      chart: { updateSeries, on: vi.fn() },
      data: {
        getViewBounds: () => ({ xMin: 20_000, xMax: 25_000, yMin: 0, yMax: 100 }),
      },
    } as unknown as PluginContext;

    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    api.registerSeries("s1", makeProvider(100_000));

    await api.loadRange("s1", 0, 5000);
    await api.loadRange("s1", 20_000, 30_000);

    const before = api.getLoadingStatus("s1").loadedChunks;
    expect(before).toBeGreaterThan(1);

    const unloaded = api.unloadDistant();
    expect(unloaded).toBeGreaterThan(0);

    const after = api.getLoadingStatus("s1").loadedChunks;
    expect(after).toBeLessThan(before);
  });

  it("autoLoad reacts to zoom and pan", async () => {
    const zoomHandlers: Array<() => void> = [];
    const panHandlers: Array<() => void> = [];
    const updateSeries = vi.fn();
    const ctx = {
      chart: {
        updateSeries,
        on: vi.fn((ev: string, cb: () => void) => {
          if (ev === "zoom") zoomHandlers.push(cb);
          if (ev === "pan") panHandlers.push(cb);
        }),
      },
      data: {
        getViewBounds: () => ({ xMin: 1000, xMax: 2000, yMin: 0, yMax: 100 }),
      },
    } as unknown as PluginContext;

    const plugin = PluginLazyLoad({
      chunkSize: 500,
      autoLoad: true,
      autoUnload: true,
      debug: false,
    });
    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    api.registerSeries("s1", makeProvider(50_000));

    zoomHandlers.forEach((h) => h());
    await Promise.resolve();
    panHandlers.forEach((h) => h());
    await Promise.resolve();

    expect(api.getLoadingStatus("s1").loadedPoints).toBeGreaterThan(0);
  });

  it("clear and unregisterSeries reset state", async () => {
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 0, xMax: 1000, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100, autoLoad: false });
    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    api.registerSeries("s1", makeProvider(10_000));
    await api.loadRange("s1", 0, 1000);
    api.unregisterSeries("s1");
    api.clear();
    expect(api.getLoadingStatus("s1").loadedPoints).toBe(0);
  });

  it("onDestroy removes lazyLoad API from chart", async () => {
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100 });
    plugin.onInit!(ctx);
    plugin.onDestroy!(ctx);
    expect((ctx.chart as any).lazyLoad).toBeUndefined();
    expect((ctx.chart as any).setDataWindow).toBeUndefined();
  });
});
