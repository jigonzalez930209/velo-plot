import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PluginReplay, type ReplayAPI } from "./index";
import type { PluginContext } from "../types";

describe("PluginReplay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createContext() {
    const updateSeries = vi.fn();
    const chart = {
      getSeries: vi.fn(() => ({
        getData: () => ({
          x: Float32Array.from([0, 1, 2, 3, 4]),
          close: Float32Array.from([10, 11, 12, 13, 14]),
          open: Float32Array.from([10, 11, 12, 13, 14]),
          high: Float32Array.from([11, 12, 13, 14, 15]),
          low: Float32Array.from([9, 10, 11, 12, 13]),
        }),
      })),
      updateSeries,
    };
    return { ctx: { chart } as unknown as PluginContext, updateSeries };
  }

  it("buffers series and seeks to index", () => {
    const plugin = PluginReplay({ seriesId: "candles", frameMs: 100 });
    const { ctx, updateSeries } = createContext();
    plugin.onInit!(ctx);

    const api = plugin.api as ReplayAPI;
    expect(api.getLength()).toBe(5);
    api.seek(2);
    expect(api.getIndex()).toBe(2);
    expect(updateSeries).toHaveBeenCalledWith(
      "candles",
      expect.objectContaining({ x: expect.any(Float32Array) }),
    );
  });

  it("steps forward and play advances bars", () => {
    const plugin = PluginReplay({ seriesId: "candles", frameMs: 100 });
    const { ctx } = createContext();
    plugin.onInit!(ctx);

    const api = plugin.api as ReplayAPI;
    api.seek(0);
    api.step(2);
    expect(api.getIndex()).toBe(2);

    api.play(1);
    expect(api.isPlaying()).toBe(true);
    vi.advanceTimersByTime(100);
    expect(api.getIndex()).toBe(3);
    api.pause();
    expect(api.isPlaying()).toBe(false);
  });

  it("pauses at end of series during play", () => {
    const plugin = PluginReplay({ seriesId: "candles", frameMs: 50 });
    const { ctx } = createContext();
    plugin.onInit!(ctx);

    const api = plugin.api as ReplayAPI;
    api.seek(3);
    api.play(1);
    vi.advanceTimersByTime(200);
    expect(api.getIndex()).toBe(4);
    expect(api.isPlaying()).toBe(false);
  });

  it("warns when series is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const plugin = PluginReplay({ seriesId: "missing" });
    const chart = { getSeries: vi.fn(() => undefined) };
    plugin.onInit!({ chart } as unknown as PluginContext);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("onDestroy pauses playback and clears buffer", () => {
    const plugin = PluginReplay({ seriesId: "candles", frameMs: 100 });
    const { ctx } = createContext();
    plugin.onInit!(ctx);
    const api = plugin.api as ReplayAPI;
    api.play(1);
    plugin.onDestroy!();
    expect(api.isPlaying()).toBe(false);
    expect(api.getLength()).toBe(0);
  });

  it("play/step/seek are inert without a loaded buffer", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const plugin = PluginReplay({ seriesId: "missing" });
    const chart = { getSeries: vi.fn(() => undefined), updateSeries: vi.fn() };
    plugin.onInit!({ chart } as unknown as PluginContext);
    const api = plugin.api as ReplayAPI;
    expect(() => {
      api.play(1);
      api.step(2);
      api.seek(1);
    }).not.toThrow();
    expect(api.isPlaying()).toBe(false);
    expect(chart.updateSeries).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("restarts the timer when play is called twice", () => {
    const plugin = PluginReplay({ seriesId: "candles", frameMs: 100 });
    const { ctx } = createContext();
    plugin.onInit!(ctx);
    const api = plugin.api as ReplayAPI;
    api.seek(0);
    api.play(1);
    api.play(2); // second call clears the existing timer first
    expect(api.isPlaying()).toBe(true);
    api.pause();
  });

  it("replays line series using y values only", () => {
    const updateSeries = vi.fn();
    const chart = {
      getSeries: () => ({
        getData: () => ({
          x: Float32Array.from([0, 1, 2]),
          y: Float32Array.from([10, 11, 12]),
        }),
      }),
      updateSeries,
    };
    const plugin = PluginReplay({ seriesId: "line" });
    plugin.onInit!({ chart } as unknown as PluginContext);
    const api = plugin.api as ReplayAPI;
    api.seek(1);
    expect(updateSeries).toHaveBeenCalledWith(
      "line",
      expect.objectContaining({ y: expect.any(Float32Array) }),
    );
  });
});
