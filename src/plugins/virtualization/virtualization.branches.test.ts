import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PluginVirtualization } from "./index";
import { Series } from "../../core/series/Series";
import type { PluginContext } from "../types";
import type { PluginVirtualizationConfig } from "./types";

function makeLine(n: number, id = "line") {
  return new Series({
    id,
    type: "line",
    data: {
      x: Float32Array.from({ length: n }, (_, i) => i),
      y: Float32Array.from({ length: n }, (_, i) => Math.sin(i * 0.01)),
    },
  });
}

function makeOhlc(n: number, id = "ohlc") {
  return new Series({
    id,
    type: "candlestick",
    data: {
      x: Float32Array.from({ length: n }, (_, i) => i),
      open: Float32Array.from({ length: n }, (_, i) => i),
      high: Float32Array.from({ length: n }, (_, i) => i + 2),
      low: Float32Array.from({ length: n }, (_, i) => i - 1),
      close: Float32Array.from({ length: n }, (_, i) => i + 1),
    },
  });
}

let rafCallbacks: FrameRequestCallback[] = [];
function flushRaf() {
  const pending = [...rafCallbacks];
  rafCallbacks = [];
  pending.forEach((cb) => cb(0));
}
const tick = () => new Promise((r) => setTimeout(r, 0));

interface SetupOpts {
  config?: Partial<PluginVirtualizationConfig>;
  series?: Series | Series[];
  viewBounds?: { xMin: number; xMax: number; yMin: number; yMax: number } | undefined;
  canvasWidth?: number;
  chartOverrides?: Record<string, unknown>;
}

function setup(opts: SetupOpts = {}) {
  const seriesList = Array.isArray(opts.series)
    ? opts.series
    : opts.series
      ? [opts.series]
      : [makeLine(3000)];
  const byId = new Map(seriesList.map((s) => [s.getId(), s]));
  const updates: Array<Record<string, unknown>> = [];
  const handlers: Record<string, Array<() => void>> = {};

  const chart: Record<string, unknown> = {
    getSeries: (id: string) => byId.get(id),
    updateSeries: vi.fn((id: string, data: Record<string, unknown>) => {
      updates.push({ id, ...data });
      byId.get(id)?.updateData(data as never);
    }),
    appendData: vi.fn((id: string, x: number[] | Float32Array, y: number[] | Float32Array) => {
      byId.get(id)?.updateData({ x, y, append: true } as never);
    }),
    on: vi.fn(),
    ...opts.chartOverrides,
  };

  const ctx = {
    chart,
    data: {
      getAllSeries: () => seriesList,
      getViewBounds: () =>
        "viewBounds" in opts ? opts.viewBounds : { xMin: 0, xMax: 3000, yMin: -1, yMax: 1 },
    },
    render: { canvasSize: { width: opts.canvasWidth ?? 400, height: 300 }, pixelRatio: 1 },
    events: {
      on: vi.fn((ev: string, cb: () => void) => {
        (handlers[ev] ??= []).push(cb);
      }),
    },
    log: { info: vi.fn() },
  } as unknown as PluginContext;

  const plugin = PluginVirtualization(opts.config);
  plugin.onInit!(ctx);
  const api = plugin.api as Record<string, (...a: unknown[]) => unknown>;
  const fire = (ev: string) => (handlers[ev] ?? []).forEach((h) => h());
  return { plugin, ctx, chart, updates, byId, api, fire };
}

describe("PluginVirtualization branch coverage", () => {
  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("resolves auto target points from canvas width", async () => {
    const { byId } = setup({ config: { targetPoints: "auto", pointsPerPixel: 2 }, canvasWidth: 300 });
    await tick();
    // auto → ~ width * pointsPerPixel points
    expect(byId.get("line")!.getData().x.length).toBeLessThanOrEqual(600 + 2);
    expect(byId.get("line")!.getData().x.length).toBeLessThan(3000);
  });

  it("does not virtualize when globally disabled", async () => {
    const { updates } = setup({ config: { enabled: false } });
    await tick();
    expect(updates).toHaveLength(0);
  });

  it("skips a series listed in excludeSeries (no include filter)", async () => {
    const kept = makeLine(3000, "keep");
    const skipped = makeLine(3000, "skip");
    const { updates } = setup({ config: { excludeSeries: ["skip"], targetPoints: 40 }, series: [kept, skipped] });
    await tick();
    expect(updates.some((u) => u.id === "keep")).toBe(true);
    expect(updates.some((u) => u.id === "skip")).toBe(false);
  });

  it("re-captures source data every pass when reuseOriginalData is false", async () => {
    const { api } = setup({ config: { reuseOriginalData: false, targetPoints: 40 } });
    await tick();
    expect((api.getStats("line") as { originalPoints: number }).originalPoints).toBe(3000);
  });

  it("ignores an empty series (no data points)", async () => {
    const empty = new Series({ id: "empty", type: "line", data: { x: new Float32Array(0), y: new Float32Array(0) } });
    const { updates } = setup({ config: { targetPoints: 40 }, series: empty, viewBounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 } });
    await tick();
    expect(updates).toHaveLength(0);
  });

  it("ignores candlestick series missing OHLC fields", async () => {
    const broken = new Series({
      id: "broken",
      type: "candlestick",
      data: { x: Float32Array.from({ length: 100 }, (_, i) => i), y: Float32Array.from({ length: 100 }, (_, i) => i) },
    } as never);
    const { updates } = setup({ config: { targetPoints: 20 }, series: broken, viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 } });
    await tick();
    expect(updates).toHaveLength(0);
  });

  it("uses full source when getViewBounds is unavailable", async () => {
    const { api } = setup({ config: { targetPoints: 40 }, viewBounds: undefined });
    await tick();
    expect((api.getStats("line") as { originalPoints: number }).originalPoints).toBe(3000);
  });

  it("restores cached data when precision switches to full", async () => {
    const { api, byId, updates } = setup({ config: { targetPoints: 40 } });
    await tick();
    expect(byId.get("line")!.getData().x.length).toBeLessThanOrEqual(40);
    updates.length = 0;
    (api.updateConfig as (c: unknown) => void)({ precision: "full" });
    flushRaf();
    await tick();
    expect(byId.get("line")!.getData().x.length).toBe(3000);
  });

  it("runs the OHLC worker path above the worker threshold", async () => {
    const ohlc = makeOhlc(3000);
    const { byId } = setup({
      config: { targetPoints: 40, useWorker: true, workerThreshold: 1000 },
      series: ohlc,
      viewBounds: { xMin: 0, xMax: 3000, yMin: -10, yMax: 10 },
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(byId.get("ohlc")!.getData().x.length).toBeLessThanOrEqual(40);
  });

  it("append path merges cached typed arrays for line series", async () => {
    const { chart, byId, api } = setup({ config: { targetPoints: 40, reuseOriginalData: true } });
    await tick();
    const before = (api.getStats("line") as { originalPoints: number }).originalPoints;
    (chart.appendData as (id: string, x: number[], y: number[]) => void)("line", [3000, 3001, 3002], [1, 2, 3]);
    flushRaf();
    await tick();
    const after = (api.getStats("line") as { originalPoints: number }).originalPoints;
    expect(after).toBe(before + 3);
    expect(byId.get("line")!.getData().x.length).toBeLessThanOrEqual(40);
  });

  it("leaves chart methods untouched when they are absent", async () => {
    const { chart } = setup({ chartOverrides: { updateSeries: undefined, appendData: undefined } });
    await tick();
    expect(chart.updateSeries).toBeUndefined();
    expect(chart.appendData).toBeUndefined();
  });

  it("debounces refresh scheduling for an unchanged viewport", async () => {
    const { fire, updates } = setup({ config: { targetPoints: 40 } });
    await tick();
    updates.length = 0;
    fire("zoom");
    fire("zoom"); // identical view key → second is a no-op
    flushRaf();
    await tick();
    expect(updates.some((u) => u.id === "line")).toBe(true);
  });

  it("handleUpdateSeries passes through when disabled", async () => {
    const { chart, byId } = setup({ config: { enabled: false } });
    await tick();
    (chart.updateSeries as (id: string, d: unknown) => void)("line", { x: Float32Array.from([0, 1]), y: Float32Array.from([1, 2]) });
    // passthrough replaces the data verbatim (no downsampling)
    expect(byId.get("line")!.getData().x.length).toBe(2);
  });

  it("handleUpdateSeries passes through for unknown series", async () => {
    const { chart } = setup({ config: { targetPoints: 40 } });
    await tick();
    expect(() =>
      (chart.updateSeries as (id: string, d: unknown) => void)("ghost", { x: Float32Array.from([0]), y: Float32Array.from([0]) }),
    ).not.toThrow();
  });

  it("handleAppendData passes through when disabled and for unknown series", async () => {
    const { chart } = setup({ config: { enabled: false } });
    await tick();
    (chart.appendData as (id: string, x: number[], y: number[]) => void)("line", [1], [1]);
    const { chart: chart2 } = setup({ config: { targetPoints: 40 } });
    await tick();
    expect(() =>
      (chart2.appendData as (id: string, x: number[], y: number[]) => void)("ghost", [1], [1]),
    ).not.toThrow();
  });

  it("invalidate targets a single series and refreshes all without an id", async () => {
    const { api } = setup({ config: { targetPoints: 40 } });
    await tick();
    (api.invalidate as (id?: string) => void)("line");
    (api.invalidate as (id?: string) => void)("ghost"); // unknown → early return
    (api.invalidate as (id?: string) => void)(); // no id → refreshAll
    await tick();
    expect(api.getStats("line")).toBeTruthy();
  });

  it("getStats returns null for an unknown series", async () => {
    const { api } = setup({ config: { targetPoints: 40 } });
    await tick();
    expect(api.getStats("nope")).toBeNull();
  });

  it("onDestroy cancels a pending refresh frame", async () => {
    const { plugin, ctx, fire } = setup({ config: { targetPoints: 40 } });
    await tick();
    fire("zoom"); // schedules a raf but we do not flush it
    plugin.onDestroy!(ctx);
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it("api methods and events are inert after destroy (ctx cleared)", async () => {
    const { plugin, ctx, api, fire } = setup({ config: { targetPoints: 40 } });
    await tick();
    plugin.onDestroy!(ctx);
    // all of these bail on the `!ctx` guards without throwing
    expect(() => {
      (api.invalidate as (id?: string) => void)("line");
      (api.invalidate as (id?: string) => void)();
      (api.disable as () => void)();
      (api.enable as () => void)();
      (api.updateConfig as (c: unknown) => void)({ targetPoints: 20 });
      fire("zoom"); // scheduleRefreshAll → !ctx guard
    }).not.toThrow();
  });

  it("coalesces refresh frames across resize events", async () => {
    const { fire } = setup({ config: { targetPoints: 40 } });
    await tick();
    // resize clears the view key each time, so both pass the key check, but the
    // second finds a pending raf already scheduled and coalesces.
    fire("resize");
    fire("resize");
    expect(rafCallbacks.length).toBeGreaterThan(0);
  });

  it("append path merges a typed-array increment", async () => {
    const { chart, api } = setup({ config: { targetPoints: 40, reuseOriginalData: true } });
    await tick();
    const before = (api.getStats("line") as { originalPoints: number }).originalPoints;
    (chart.appendData as (id: string, x: Float32Array, y: Float32Array) => void)(
      "line",
      Float32Array.from([3000, 3001]),
      Float32Array.from([1, 2]),
    );
    flushRaf();
    await tick();
    const after = (api.getStats("line") as { originalPoints: number }).originalPoints;
    expect(after).toBe(before + 2);
  });

  it("ignores a non-OHLC series that has no Y data", async () => {
    // A hand-rolled series that reports a line type but exposes only X data,
    // exercising the `!live.y` guard in captureOriginalFromSeries.
    const noY = {
      getId: () => "noY",
      getType: () => "line",
      getData: () => ({ x: Float32Array.from({ length: 100 }, (_, i) => i) }),
      updateData: vi.fn(),
      isVisible: () => true,
    } as unknown as Series;
    const { updates } = setup({
      config: { targetPoints: 20 },
      series: noY,
      viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 },
    });
    await tick();
    expect(updates).toHaveLength(0);
  });
});
