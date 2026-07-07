import { describe, it, expect, vi, beforeEach } from "vitest";
import { PluginCaching } from "./index";
import type { PluginContext } from "../types";

describe("PluginCaching onDataUpdate", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { setInterval: vi.fn(() => 1), clearInterval: vi.fn() });
  });

  it("invalidates tagged entries on data update when autoInvalidate is enabled", () => {
    const plugin = PluginCaching({ autoInvalidate: true, debug: false });
    const ctx = { chart: {} } as PluginContext;

    plugin.onInit!(ctx);
    const caching = (ctx.chart as any).caching;

    caching.set("bounds:series-a", { min: 0, max: 1 }, { tags: ["bounds"] });
    caching.set("analysis:rsi", [1, 2, 3], { tags: ["analysis"] });
    expect(caching.has("bounds:series-a")).toBe(true);
    expect(caching.has("analysis:rsi")).toBe(true);

    plugin.onDataUpdate!(ctx, {
      seriesId: "series-a",
      mode: "replace",
      pointCount: 100,
      bounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 1 },
    });

    expect(caching.has("bounds:series-a")).toBe(false);
    expect(caching.has("analysis:rsi")).toBe(false);
  });

  it("skips invalidation when autoInvalidate is disabled", () => {
    const plugin = PluginCaching({ autoInvalidate: false });
    const ctx = { chart: {} } as PluginContext;

    plugin.onInit!(ctx);
    const caching = (ctx.chart as any).caching;
    caching.set("bounds:x", 1, { tags: ["bounds"] });

    plugin.onDataUpdate!(ctx, {
      seriesId: "x",
      mode: "append",
      pointCount: 10,
      bounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 1 },
    });

    expect(caching.has("bounds:x")).toBe(true);
  });

  it("getStats reports entry count after set", () => {
    const plugin = PluginCaching({ autoInvalidate: false });
    const ctx = { chart: {} } as PluginContext;
    plugin.onInit!(ctx);
    const caching = (ctx.chart as any).caching;
    caching.set("k1", 42);
    expect(caching.getStats().entryCount).toBe(1);
    caching.clear();
    expect(caching.getStats().entryCount).toBe(0);
  });
});
