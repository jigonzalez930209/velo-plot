import { describe, it, expect, vi, beforeEach } from "vitest";
import { PluginCaching } from "./index";
import type { PluginContext } from "../types";

describe("PluginCaching", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { setInterval: vi.fn(() => 1), clearInterval: vi.fn() });
  });

  function init(autoInvalidate = true) {
    const plugin = PluginCaching({ autoInvalidate, debug: false, maxSize: 10 });
    const ctx = { chart: {} } as PluginContext;
    plugin.onInit!(ctx);
    return { plugin, caching: (ctx.chart as any).caching, ctx };
  }

  it("invalidates tagged entries on data update when autoInvalidate is enabled", () => {
    const { plugin, caching, ctx } = init(true);
    caching.set("bounds:series-a", { min: 0, max: 1 }, { tags: ["bounds"] });
    caching.set("analysis:rsi", [1, 2, 3], { tags: ["analysis"] });
    expect(caching.has("bounds:series-a")).toBe(true);

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
    const { plugin, caching, ctx } = init(false);
    caching.set("bounds:x", 1, { tags: ["bounds"] });

    plugin.onDataUpdate!(ctx, {
      seriesId: "x",
      mode: "append",
      pointCount: 10,
      bounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 1 },
    });

    expect(caching.has("bounds:x")).toBe(true);
  });

  it("get/set/has and stats track cache entries", () => {
    const { caching } = init(false);
    caching.set("k1", { value: 42 }, { ttl: 60_000 });
    expect(caching.has("k1")).toBe(true);
    expect(caching.get("k1")).toEqual({ value: 42 });
    const stats = caching.getStats();
    expect(stats.size).toBeGreaterThanOrEqual(1);
    caching.clear();
    expect(caching.has("k1")).toBe(false);
  });
});
