import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PluginCaching } from "./index";
import type { PluginContext } from "../types";

describe("PluginCaching", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function init(opts: Record<string, unknown> = {}) {
    const plugin = PluginCaching({ autoInvalidate: false, debug: false, ...opts });
    const ctx = { chart: {} } as PluginContext;
    plugin.onInit!(ctx);
    return { plugin, ctx, caching: (ctx.chart as any).caching as Record<string, any> };
  }

  it("invalidates tagged entries on data update when autoInvalidate is enabled", () => {
    const { plugin, ctx, caching } = init({ autoInvalidate: true });
    caching.set("bounds:series-a", { min: 0, max: 1 }, { tags: ["bounds"] });
    caching.set("analysis:rsi", [1, 2, 3], { tags: ["analysis"] });

    plugin.onDataUpdate!(ctx, {
      seriesId: "series-a",
      mode: "replace",
      pointCount: 100,
      bounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 1 },
    });

    expect(caching.has("bounds:series-a")).toBe(false);
    expect(caching.has("analysis:rsi")).toBe(false);
  });

  it("get returns value and tracks hits", () => {
    const { caching } = init();
    caching.set("k", { v: 1 });
    expect(caching.get("k")).toEqual({ v: 1 });
    expect(caching.getStats().hits).toBe(1);
    expect(caching.get("missing")).toBeUndefined();
    expect(caching.getStats().misses).toBe(1);
  });

  it("delete removes a key", () => {
    const { caching } = init();
    caching.set("k", 1);
    expect(caching.delete("k")).toBe(true);
    expect(caching.has("k")).toBe(false);
  });

  it("invalidateByTags removes matching entries", () => {
    const { caching } = init();
    caching.set("a", 1, { tags: ["bounds"] });
    caching.set("b", 2, { tags: ["analysis"] });
    const n = caching.invalidateByTags(["bounds"]);
    expect(n).toBe(1);
    expect(caching.has("a")).toBe(false);
    expect(caching.has("b")).toBe(true);
  });

  it("evicts LRU entries when maxSize exceeded", () => {
    const { caching } = init({ maxSize: 50, strategy: "lru" });
    caching.set("a", "x".repeat(20));
    caching.set("b", "y".repeat(20));
    caching.get("a");
    caching.set("c", "z".repeat(20));
    expect(caching.has("b")).toBe(false);
    expect(caching.getStats().evictions).toBeGreaterThan(0);
  });

  it("prune removes expired TTL entries", () => {
    const { caching } = init();
    caching.set("short", 1, { ttl: 10 });
    vi.advanceTimersByTime(20);
    expect(caching.prune()).toBe(1);
    expect(caching.has("short")).toBe(false);
  });

  it("disabled cache skips set/get", () => {
    const { caching } = init({ enabled: false });
    caching.set("k", 1);
    expect(caching.has("k")).toBe(false);
    expect(caching.get("k")).toBeUndefined();
  });

  it("onDestroy clears cache and detaches API", () => {
    const { plugin, ctx, caching } = init();
    caching.set("k", 1);
    plugin.onDestroy!(ctx);
    expect((ctx.chart as any).caching).toBeUndefined();
  });

  it("keys and resetStats work", () => {
    const { caching } = init();
    caching.set("one", 1);
    caching.set("two", 2);
    expect(caching.keys().sort()).toEqual(["one", "two"]);
    caching.get("one");
    caching.resetStats();
    expect(caching.getStats().hits).toBe(0);
  });
});
