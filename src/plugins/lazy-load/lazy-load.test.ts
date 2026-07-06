import { describe, it, expect, vi, beforeEach } from "vitest";
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
});
