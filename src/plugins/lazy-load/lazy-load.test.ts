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
    expect(api.getLoadingStatus("s1").loadedPoints).toBeGreaterThan(0);
    api.clear();
    expect(api.getLoadingStatus("s1").loadedPoints).toBe(0);
    api.unregisterSeries("s1");
    expect(api.getLoadingStatus("s1")).toBeNull();
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

  it("setDataWindow targets a single series and loadVisible loads viewport", async () => {
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 500, xMax: 1500, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 500, autoLoad: false });
    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    api.registerSeries("s1", makeProvider(20_000));
    api.registerSeries("s2", makeProvider(20_000));
    await (ctx.chart as any).setDataWindow({ from: 1000, to: 1200, seriesId: "s1" });
    expect(api.getLoadingStatus("s1").loadedPoints).toBeGreaterThan(0);
    expect(api.getLoadingStatus("s2").loadedPoints).toBe(0);
    await api.loadVisible();
    expect(api.getLoadingStatus("s2").loadedPoints).toBeGreaterThan(0);
  });

  it("updateConfig and disabled plugin skip setDataWindow", async () => {
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100, enabled: false });
    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    api.registerSeries("s1", makeProvider(1000));
    await (ctx.chart as any).setDataWindow({ from: 0, to: 100 });
    expect(api.getLoadingStatus("s1").loadedPoints).toBe(0);
    api.updateConfig({ enabled: true });
    await (ctx.chart as any).setDataWindow({ from: 0, to: 100 });
    expect(api.getLoadingStatus("s1").loadedPoints).toBeGreaterThan(0);
  });

  it("no-ops loading when the chart reports no view bounds", async () => {
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => undefined },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100, autoLoad: false, autoUnload: true });
    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    api.registerSeries("s1", makeProvider(1000));
    await api.loadVisible();
    expect(api.getLoadingStatus("s1").loadedPoints).toBe(0);
    expect(api.unloadDistant()).toBe(0);
  });

  it("unloadDistant returns 0 when auto-unload is disabled", async () => {
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100, autoLoad: false, autoUnload: false });
    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    api.registerSeries("s1", makeProvider(1000));
    await api.loadRange("s1", 0, 500);
    expect(api.unloadDistant()).toBe(0);
  });

  it("fires default progress and complete handlers with debug logging", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 0, xMax: 300, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    // No progress/complete handlers → default no-ops execute; debug hits the log branch.
    const plugin = PluginLazyLoad({ chunkSize: 100, autoLoad: false, debug: true });
    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    api.registerSeries("s1", makeProvider(300));
    await api.loadRange("s1", 0, 300); // partial chunks then full → onLoadProgress + onLoadComplete
    expect(api.getLoadingStatus("s1").loadedPoints).toBe(300);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("reports load errors through onLoadError", async () => {
    const onLoadError = vi.fn();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider: DataProvider = {
      getTotalCount: () => 1000,
      loadChunk: async () => {
        throw new Error("network down");
      },
    };
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100, autoLoad: false, debug: true, onLoadError });
    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    api.registerSeries("s1", provider);
    await api.loadRange("s1", 0, 100);
    expect(onLoadError).toHaveBeenCalledWith(expect.any(Error), "s1");
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("invokes onLoadError callback from config", async () => {
    const onLoadError = vi.fn();
    const provider = makeProvider(1000);
    provider.loadChunk = async () => {
      throw new Error("chunk failed");
    };
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100, autoLoad: false, onLoadError });
    plugin.onInit!(ctx);
    const api = (ctx.chart as { lazyLoad: { registerSeries: (id: string, p: typeof provider) => void; loadRange: (id: string, from: number, to: number) => Promise<void> } }).lazyLoad;
    api.registerSeries("s1", provider);
    await api.loadRange("s1", 0, 100);
    expect(onLoadError).toHaveBeenCalledWith(expect.any(Error), "s1");
  });

  it("loadVisible skips work when view bounds are unavailable", () => {
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => null },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100, autoLoad: true });
    plugin.onInit!(ctx);
    const api = (ctx.chart as { lazyLoad: { registerSeries: (id: string, p: ReturnType<typeof makeProvider>) => void } }).lazyLoad;
    api.registerSeries("s1", makeProvider(500));
    expect((ctx.chart as { updateSeries: ReturnType<typeof vi.fn> }).updateSeries).not.toHaveBeenCalled();
  });

  it("updateSeriesData bails and empty-merge is a no-op after destroy", async () => {
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100, autoLoad: false });
    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    api.registerSeries("s1", makeProvider(1000));
    plugin.onDestroy!(ctx); // ctx = null, chunks cleared
    // loadRange still works on the retained api but updateSeriesData bails (ctx null)
    await expect(api.loadRange("s1", 0, 100)).resolves.toBeUndefined();
  });

  it("evicts least-recently-loaded chunks beyond maxLoadedChunks", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      // wide viewport + huge threshold so nothing is unloaded by distance,
      // forcing the maxLoadedChunks (LRU) eviction path instead.
      data: { getViewBounds: () => ({ xMin: 0, xMax: 100_000, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({
      chunkSize: 100,
      autoLoad: false,
      autoUnload: true,
      viewportBuffer: 100,
      unloadThreshold: 100,
      maxLoadedChunks: 2,
      debug: true,
    });
    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    api.registerSeries("s1", makeProvider(1000));
    await api.loadRange("s1", 0, 500); // loads 6 chunks (0..5)
    expect(api.getLoadingStatus("s1").loadedChunks).toBeGreaterThan(2);
    const unloaded = api.unloadDistant();
    expect(unloaded).toBeGreaterThan(0);
    expect(api.getLoadingStatus("s1").loadedChunks).toBe(2);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("ignores unknown series in loadRange, setDataWindow, and unregister", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100, autoLoad: false, debug: true });
    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    await expect(api.loadRange("ghost", 0, 100)).resolves.toBeUndefined();
    await expect(
      (ctx.chart as any).setDataWindow({ from: 0, to: 100, seriesId: "ghost" }),
    ).resolves.toBeUndefined();
    api.unregisterSeries("ghost"); // debug-logs even for unknown ids
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("invokes default onLoadError when no handler is configured", async () => {
    const provider: DataProvider = {
      getTotalCount: () => 1000,
      loadChunk: async () => {
        throw new Error("network down");
      },
    };
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100, autoLoad: false });
    plugin.onInit!(ctx);
    const api = (ctx.chart as { lazyLoad: { registerSeries: (id: string, p: DataProvider) => void; loadRange: (id: string, from: number, to: number) => Promise<void> } }).lazyLoad;
    api.registerSeries("s1", provider);
    await expect(api.loadRange("s1", 0, 100)).resolves.toBeUndefined();
  });

  it("updateSeriesData returns early when all chunks were unloaded", async () => {
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 5000, xMax: 6000, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({
      chunkSize: 10,
      autoLoad: false,
      autoUnload: true,
      viewportBuffer: 0,
      unloadThreshold: 0,
    });
    plugin.onInit!(ctx);
    const api = (ctx.chart as { lazyLoad: { registerSeries: (id: string, p: ReturnType<typeof makeProvider>) => void; loadRange: (id: string, from: number, to: number) => Promise<void>; unloadDistant: () => number } }).lazyLoad;
    api.registerSeries("s1", makeProvider(100));
    await api.loadRange("s1", 0, 30);
    const updateSeries = (ctx.chart as { updateSeries: ReturnType<typeof vi.fn> }).updateSeries;
    updateSeries.mockClear();
    const unloaded = api.unloadDistant();
    expect(unloaded).toBeGreaterThan(0);
    expect(updateSeries).not.toHaveBeenCalled();
  });

  it("getVisibleRange returns null after destroy", async () => {
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100, autoLoad: false, autoUnload: true });
    plugin.onInit!(ctx);
    const api = (ctx.chart as { lazyLoad: { registerSeries: (id: string, p: ReturnType<typeof makeProvider>) => void; loadRange: (id: string, from: number, to: number) => Promise<void>; unloadDistant: () => number } }).lazyLoad;
    api.registerSeries("s1", makeProvider(1000));
    await api.loadRange("s1", 0, 200);
    plugin.onDestroy!(ctx);
    expect(api.unloadDistant()).toBe(0);
  });

  it("registerSeries fires onLoadStart and debug logging", async () => {
    const onLoadStart = vi.fn();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const ctx = {
      chart: { updateSeries: vi.fn(), on: vi.fn() },
      data: { getViewBounds: () => ({ xMin: 0, xMax: 1000, yMin: 0, yMax: 1 }) },
    } as unknown as PluginContext;
    const plugin = PluginLazyLoad({ chunkSize: 100, autoLoad: false, debug: true, onLoadStart });
    plugin.onInit!(ctx);
    const api = (ctx.chart as any).lazyLoad;
    api.registerSeries("s1", makeProvider(5000));
    expect(onLoadStart).toHaveBeenCalledWith(expect.objectContaining({ seriesId: "s1", totalPoints: 5000 }));
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
