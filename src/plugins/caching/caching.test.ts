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

  it("LFU strategy evicts least frequently used entry", () => {
    const { caching } = init({ maxSize: 20, strategy: "lfu" });
    caching.set("a", "aaaa");
    caching.set("b", "bbbb");
    caching.get("b");
    caching.get("b");
    caching.set("c", "cccc");
    expect(caching.has("a")).toBe(false);
    expect(caching.has("b")).toBe(true);
  });

  it("FIFO strategy evicts oldest entry", () => {
    const { caching } = init({ maxSize: 50, strategy: "fifo" });
    caching.set("a", "x".repeat(20));
    caching.set("b", "y".repeat(20));
    caching.get("a");
    caching.set("c", "z".repeat(20));
    expect(caching.has("a")).toBe(false);
  });

  it("get drops expired TTL entries", () => {
    const { caching } = init();
    caching.set("k", 1, { ttl: 5 });
    vi.advanceTimersByTime(10);
    expect(caching.get("k")).toBeUndefined();
    expect(caching.getStats().misses).toBe(1);
  });

  it("set skips values larger than maxSize and replaces existing keys", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { caching } = init({ maxSize: 20 });
    caching.set("huge", "x".repeat(100));
    expect(caching.has("huge")).toBe(false);
    caching.set("k", 1);
    caching.set("k", 2);
    expect(caching.get("k")).toBe(2);
    warn.mockRestore();
  });

  it("clear and invalidate invoke onInvalidate callback", () => {
    const onInvalidate = vi.fn();
    const { caching } = init({ onInvalidate, autoInvalidate: false });
    caching.set("a", 1, { tags: ["bounds"] });
    caching.clear();
    expect(onInvalidate).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "manual" }),
    );
    caching.set("b", 2, { tags: ["analysis"] });
    caching.invalidateByTags(["analysis"]);
    expect(onInvalidate).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "tag", keys: ["b"] }),
    );
  });

  it("onDataUpdate respects cacheTypes toggles", () => {
    const { plugin, ctx, caching } = init({
      autoInvalidate: true,
      cacheTypes: { transforms: false, analysis: true, frames: false, bounds: false },
    });
    caching.set("bounds:series-a", 1, { tags: ["bounds"] });
    caching.set("analysis:rsi", 2, { tags: ["analysis"] });
    plugin.onDataUpdate!(ctx, { seriesId: "series-a", mode: "replace", pointCount: 1 });
    expect(caching.has("bounds:series-a")).toBe(true);
    expect(caching.has("analysis:rsi")).toBe(false);
  });

  it("estimates sizes for typed arrays and nested objects", () => {
    const { caching } = init({ maxSize: 10_000 });
    caching.set("arr", [1, { nested: true }]);
    caching.set("f64", new Float64Array(10));
    caching.set("bool", true);
    caching.set("num", 42);
    expect(caching.size()).toBe(4);
    expect(caching.delete("missing")).toBe(false);
    expect(caching.has("num")).toBe(true);
    (caching as any).updateConfig({ debug: true });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    caching.set("dbg", 1);
    caching.get("dbg");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
