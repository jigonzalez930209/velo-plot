import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMasterSlave, ChartGroup, createChartGroup, linkCharts, type ChartLike } from "./index";
import type { Bounds } from "../../types";

function createMockChart(
  id: string,
  bounds: Bounds,
  handlers: Map<string, (...args: unknown[]) => void> = new Map(),
): ChartLike & { emit: (event: string, data: unknown) => void } {
  let viewBounds = { ...bounds };
  const zoom = vi.fn((opts: { x?: [number, number]; y?: [number, number] }) => {
    if (opts.x) {
      viewBounds.xMin = opts.x[0];
      viewBounds.xMax = opts.x[1];
    }
    if (opts.y) {
      viewBounds.yMin = opts.y[0];
      viewBounds.yMax = opts.y[1];
    }
  });

  return {
    getId: () => id,
    getViewBounds: () => ({ ...viewBounds }),
    zoom,
    pan: vi.fn(),
    on: (event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(`${id}:${event}`, cb);
    },
    off: (event: string, cb: (...args: unknown[]) => void) => {
      if (handlers.get(`${id}:${event}`) === cb) handlers.delete(`${id}:${event}`);
    },
    emit(event: string, data: unknown) {
      handlers.get(`${id}:${event}`)?.(data);
    },
  };
}

describe("ChartGroup master-slave sync", () => {
  let rafCallbacks: FrameRequestCallback[] = [];

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function flushRaf() {
    const pending = [...rafCallbacks];
    rafCallbacks = [];
    pending.forEach((cb) => cb(0));
  }

  it("createMasterSlave sets masterId so slave zoom does not propagate to master", () => {
    const masterHandlers = new Map<string, (...args: unknown[]) => void>();
    const slaveHandlers = new Map<string, (...args: unknown[]) => void>();

    const master = createMockChart(
      "master",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 50 },
      masterHandlers,
    );
    const slave = createMockChart(
      "slave",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 10 },
      slaveHandlers,
    );

    createMasterSlave(master, slave, "x");

    slave.emit("zoom", { x: [0, 1e-5] as [number, number], y: [0, 1] as [number, number] });
    flushRaf();

    expect(master.zoom).not.toHaveBeenCalled();
  });

  it("master zoom propagates X to slave", () => {
    const masterHandlers = new Map<string, (...args: unknown[]) => void>();
    const slaveHandlers = new Map<string, (...args: unknown[]) => void>();

    const master = createMockChart(
      "master",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 50 },
      masterHandlers,
    );
    const slave = createMockChart(
      "slave",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 10 },
      slaveHandlers,
    );

    createMasterSlave(master, slave, "x");

    master.emit("zoom", { x: [10, 90] as [number, number], y: [0, 50] as [number, number] });
    flushRaf();

    expect(slave.zoom).toHaveBeenCalledWith(
      expect.objectContaining({ x: [10, 90], animate: false }),
    );
    expect(slave.zoom).not.toHaveBeenCalledWith(
      expect.objectContaining({ y: [0, 50] }),
    );
  });

  it("ignores zoom from master with invalid bounds", () => {
    const masterHandlers = new Map<string, (...args: unknown[]) => void>();
    const slaveHandlers = new Map<string, (...args: unknown[]) => void>();

    const master = createMockChart(
      "master",
      { xMin: 0, xMax: 0, yMin: 0, yMax: 0 },
      masterHandlers,
    );
    const slave = createMockChart(
      "slave",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 10 },
      slaveHandlers,
    );

    createMasterSlave(master, slave, "x");

    master.emit("zoom", { x: [0, 0] as [number, number], y: [0, 0] as [number, number] });
    flushRaf();

    expect(slave.zoom).not.toHaveBeenCalled();
  });

  it("master pan propagates master view bounds X to slave", () => {
    const masterHandlers = new Map<string, (...args: unknown[]) => void>();
    const slaveHandlers = new Map<string, (...args: unknown[]) => void>();

    const master = createMockChart(
      "master",
      { xMin: 10, xMax: 90, yMin: 0, yMax: 50 },
      masterHandlers,
    );
    const slave = createMockChart(
      "slave",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 10 },
      slaveHandlers,
    );

    createMasterSlave(master, slave, "x");

    master.emit("pan", { deltaX: 5, deltaY: 0 });
    flushRaf();

    expect(slave.zoom).toHaveBeenCalledWith({
      x: [10, 90],
      animate: false,
    });
  });

  it("master zoom propagates Y only when axis is y", () => {
    const masterHandlers = new Map<string, (...args: unknown[]) => void>();
    const slaveHandlers = new Map<string, (...args: unknown[]) => void>();

    const master = createMockChart(
      "master",
      { xMin: 0, xMax: 100, yMin: 5, yMax: 45 },
      masterHandlers,
    );
    const slave = createMockChart(
      "slave",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 10 },
      slaveHandlers,
    );

    createMasterSlave(master, slave, "y");

    master.emit("zoom", { x: [0, 100] as [number, number], y: [5, 45] as [number, number] });
    flushRaf();

    expect(slave.zoom).toHaveBeenCalledWith(
      expect.objectContaining({ y: [5, 45], animate: false }),
    );
    expect(slave.zoom).not.toHaveBeenCalledWith(
      expect.objectContaining({ x: [0, 100] }),
    );
  });

  it("master pan propagates Y bounds when axis is y", () => {
    const masterHandlers = new Map<string, (...args: unknown[]) => void>();
    const slaveHandlers = new Map<string, (...args: unknown[]) => void>();

    const master = createMockChart(
      "master",
      { xMin: 0, xMax: 100, yMin: 12, yMax: 88 },
      masterHandlers,
    );
    const slave = createMockChart(
      "slave",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 10 },
      slaveHandlers,
    );

    createMasterSlave(master, slave, "y");

    master.emit("pan", { deltaX: 0, deltaY: 3 });
    flushRaf();

    expect(slave.zoom).toHaveBeenCalledWith({
      y: [12, 88],
      animate: false,
    });
  });

  it("bidirectional group syncs both charts on zoom", () => {
    const handlers1 = new Map<string, (...args: unknown[]) => void>();
    const handlers2 = new Map<string, (...args: unknown[]) => void>();

    const chart1 = createMockChart(
      "c1",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 50 },
      handlers1,
    );
    const chart2 = createMockChart(
      "c2",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 10 },
      handlers2,
    );

    const group = new ChartGroup({ axis: "x", bidirectional: true });
    group.addAll(chart1, chart2);

    chart2.emit("zoom", { x: [20, 80] as [number, number], y: [0, 10] as [number, number] });
    flushRaf();

    expect(chart1.zoom).toHaveBeenCalledWith(
      expect.objectContaining({ x: [20, 80], animate: false }),
    );
  });

  it("updateOptions can disable zoom sync", () => {
    const handlers1 = new Map<string, (...args: unknown[]) => void>();
    const handlers2 = new Map<string, (...args: unknown[]) => void>();

    const chart1 = createMockChart(
      "c1",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 50 },
      handlers1,
    );
    const chart2 = createMockChart(
      "c2",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 10 },
      handlers2,
    );

    const group = new ChartGroup({ axis: "x", bidirectional: true });
    group.addAll(chart1, chart2);
    group.updateOptions({ syncZoom: false });

    chart1.emit("zoom", { x: [10, 90] as [number, number], y: [0, 50] as [number, number] });
    flushRaf();

    expect(chart2.zoom).not.toHaveBeenCalled();
  });

  it("bidirectional with masterId lets any pane propagate X zoom", () => {
    const masterHandlers = new Map<string, (...args: unknown[]) => void>();
    const slaveHandlers = new Map<string, (...args: unknown[]) => void>();

    const master = createMockChart(
      "master",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 50 },
      masterHandlers,
    );
    const slave = createMockChart(
      "slave",
      { xMin: 0, xMax: 100, yMin: 0, yMax: 10 },
      slaveHandlers,
    );

    const group = new ChartGroup({
      axis: "x",
      bidirectional: true,
      masterId: "master",
    });
    group.addAll(master, slave);

    slave.emit("zoom", { x: [20, 80] as [number, number], y: [2, 8] as [number, number] });
    flushRaf();

    expect(master.zoom).toHaveBeenCalledWith(
      expect.objectContaining({ x: [20, 80], animate: false }),
    );
    expect(master.zoom).not.toHaveBeenCalledWith(
      expect.objectContaining({ y: [2, 8] }),
    );
  });
});

describe("ChartGroup fitAll", () => {
  it("fits master once then applies shared X to slaves only", () => {
    const master = {
      getId: () => "master",
      getViewBounds: () => ({ xMin: 10, xMax: 90, yMin: 80, yMax: 120 }),
      fit: vi.fn(),
      zoom: vi.fn(),
      pan: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
    const slave = {
      getId: () => "slave",
      getViewBounds: () => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 10 }),
      fit: vi.fn(),
      zoom: vi.fn(),
      pan: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };

    const group = new ChartGroup({ masterId: "master", axis: "x" });
    group.addAll(master, slave);

    group.fitAll();

    expect(master.fit).toHaveBeenCalledTimes(1);
    expect(slave.fit).toHaveBeenCalledWith({ x: [10, 90], padding: undefined });
  });
});

describe("ChartGroup selection sync", () => {
  it("propagates selection from source to other charts when syncSelection is enabled", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const selected = [{ seriesId: "s1", indices: [1, 2] }];

    const chartA = {
      ...createMockChart("a", { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }, handlers),
      getSelectedPoints: vi.fn(() => selected),
      selectPoints: vi.fn(),
      clearSelection: vi.fn(),
    };
    const chartB = {
      ...createMockChart("b", { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }, handlers),
      getSelectedPoints: vi.fn(() => []),
      selectPoints: vi.fn(),
      clearSelection: vi.fn(),
    };

    const group = new ChartGroup({ syncSelection: true, axis: "x" });
    group.addAll(chartA, chartB);

    chartA.emit("selectionChange", { selected });

    expect(chartB.selectPoints).toHaveBeenCalledWith(selected);
    expect(chartA.selectPoints).not.toHaveBeenCalled();
  });

  it("clears selection on slaves when source clears selection", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();

    const chartA = {
      ...createMockChart("a", { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }, handlers),
      selectPoints: vi.fn(),
      clearSelection: vi.fn(),
    };
    const chartB = {
      ...createMockChart("b", { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }, handlers),
      selectPoints: vi.fn(),
      clearSelection: vi.fn(),
    };

    const group = new ChartGroup({ syncSelection: true, axis: "x" });
    group.addAll(chartA, chartB);

    chartA.emit("selectionChange", { selected: [] });

    expect(chartB.clearSelection).toHaveBeenCalled();
  });

  it("falls back to getSelectedPoints when event payload is empty", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const selected = [{ seriesId: "s", indices: [1, 2] }];
    const chartA = {
      ...createMockChart("a", { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }, handlers),
      selectPoints: vi.fn(),
      getSelectedPoints: vi.fn(() => selected),
    };
    const chartB = {
      ...createMockChart("b", { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }, handlers),
      selectPoints: vi.fn(),
    };

    const group = new ChartGroup({ syncSelection: true, axis: "x" });
    group.addAll(chartA, chartB);

    chartA.emit("selectionChange", {});
    expect(chartB.selectPoints).toHaveBeenCalledWith(selected);
  });
});

describe("ChartGroup helpers and cursor sync", () => {
  let rafCallbacks: FrameRequestCallback[] = [];

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function flushRaf() {
    const pending = [...rafCallbacks];
    rafCallbacks = [];
    pending.forEach((cb) => cb(0));
  }

  it("createChartGroup and linkCharts register charts", () => {
    const a = createMockChart("a", { xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
    const b = createMockChart("b", { xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
    expect(createChartGroup([a, b]).size()).toBe(2);
    expect(linkCharts(a, b).size()).toBe(2);
  });

  it("syncs external cursor between charts on hover", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }, handlers);
    const b = {
      ...createMockChart("b", { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }, handlers),
      setExternalCursor: vi.fn(),
      clearExternalCursor: vi.fn(),
    };

    const group = new ChartGroup({ syncCursor: true, axis: "x" });
    group.addAll(a, b);

    a.emit("hover", { point: { x: 42, y: 7 } });
    expect(b.setExternalCursor).toHaveBeenCalledWith(42, 7);

    a.emit("hover", null);
    expect(b.clearExternalCursor).toHaveBeenCalled();
  });

  it("debounces sync actions when debounce option is set", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", { xMin: 0, xMax: 100, yMin: 0, yMax: 50 }, handlers);
    const b = createMockChart("b", { xMin: 0, xMax: 100, yMin: 0, yMax: 10 }, handlers);

    const group = new ChartGroup({ axis: "x", debounce: 50 });
    group.addAll(a, b);

    a.emit("zoom", { x: [10, 90] as [number, number], y: [0, 50] as [number, number] });
    expect(b.zoom).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(b.zoom).toHaveBeenCalled();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("remove and destroy clean up group state", () => {
    const a = createMockChart("a", { xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
    const b = createMockChart("b", { xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
    const group = new ChartGroup();
    group.addAll(a, b);
    group.remove(a);
    expect(group.size()).toBe(1);
    group.destroy();
    expect(group.size()).toBe(0);
  });

  it("syncTo propagates partial bounds", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", { xMin: 0, xMax: 100, yMin: 0, yMax: 50 }, handlers);
    const b = createMockChart("b", { xMin: 0, xMax: 100, yMin: 0, yMax: 10 }, handlers);
    const group = new ChartGroup({ axis: "xy" });
    group.addAll(a, b);
    group.syncTo({ xMin: 5, xMax: 95, yMin: 1, yMax: 9 }, "a");
    expect(b.zoom).toHaveBeenCalledWith(
      expect.objectContaining({ x: [5, 95], y: [1, 9], animate: false }),
    );
  });

  it("ignores zoom with invalid x span", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", { xMin: 0, xMax: 100, yMin: 0, yMax: 50 }, handlers);
    const b = createMockChart("b", { xMin: 0, xMax: 100, yMin: 0, yMax: 10 }, handlers);
    const group = new ChartGroup({ axis: "x" });
    group.addAll(a, b);
    a.emit("zoom", { x: [10, 10] as [number, number], y: [0, 50] as [number, number] });
    flushRaf();
    expect(b.zoom).not.toHaveBeenCalled();
  });

  it("master-only mode blocks slave zoom propagation", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const master = createMockChart("master", { xMin: 0, xMax: 100, yMin: 0, yMax: 50 }, handlers);
    const slave = createMockChart("slave", { xMin: 0, xMax: 100, yMin: 0, yMax: 10 }, handlers);
    const group = new ChartGroup({ axis: "x", masterId: "master", bidirectional: false });
    group.addAll(master, slave);
    slave.emit("zoom", { x: [1, 2] as [number, number], y: [0, 1] as [number, number] });
    flushRaf();
    expect(master.zoom).not.toHaveBeenCalled();
    master.emit("zoom", { x: [10, 90] as [number, number], y: [0, 50] as [number, number] });
    flushRaf();
    expect(slave.zoom).toHaveBeenCalled();
  });

  it("propagates pan on y-only axis sync", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", { xMin: 0, xMax: 10, yMin: 0, yMax: 100 }, handlers);
    const b = createMockChart("b", { xMin: 0, xMax: 10, yMin: 0, yMax: 50 }, handlers);
    const group = new ChartGroup({ axis: "y", syncPan: true });
    group.addAll(a, b);
    a.emit("pan", { deltaX: 5, deltaY: -3 });
    flushRaf();
    expect(b.zoom).toHaveBeenCalledWith(
      expect.objectContaining({ y: [0, 100], animate: false }),
    );
  });

  it("bidirectional false without master allows both charts to sync zoom", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", { xMin: 0, xMax: 100, yMin: 0, yMax: 50 }, handlers);
    const b = createMockChart("b", { xMin: 0, xMax: 100, yMin: 0, yMax: 10 }, handlers);
    const group = new ChartGroup({ axis: "x", bidirectional: false });
    group.addAll(a, b);
    b.emit("zoom", { x: [5, 95] as [number, number], y: [0, 10] as [number, number] });
    flushRaf();
    expect(a.zoom).toHaveBeenCalled();
  });

  it("batch, clearAllSelections, resetAll, and has work", () => {
    const a = createMockChart("a", { xMin: 0, xMax: 10, yMin: 0, yMax: 10 });
    const b = {
      ...createMockChart("b", { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }),
      clearSelection: vi.fn(),
      fit: vi.fn(),
    };
    const group = new ChartGroup();
    group.addAll(a, b);
    expect(group.has(a)).toBe(true);
    const result = group.batch(() => 42);
    expect(result).toBe(42);
    group.clearAllSelections();
    expect(b.clearSelection).toHaveBeenCalled();
    group.resetAll();
    expect(b.fit).toHaveBeenCalled();
    group.remove({ getId: () => "missing" } as any);
    expect(group.size()).toBe(2);
  });

  it("syncZoom no-ops when state unchanged", () => {
    const group = new ChartGroup({ syncZoom: true });
    expect(group.syncZoom(true)).toBe(group);
  });
});

describe("ChartGroup branch coverage", () => {
  let rafCallbacks: FrameRequestCallback[] = [];
  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());
  const B = { xMin: 0, xMax: 100, yMin: 0, yMax: 50 };
  function flushRaf() {
    const pending = [...rafCallbacks];
    rafCallbacks = [];
    pending.forEach((cb) => cb(0));
  }

  it("exposes simple configuration accessors and mutators", () => {
    const a = createMockChart("a", B);
    const b = createMockChart("b", B);
    const g = new ChartGroup();
    g.addAll(a, b);
    expect(g.getCharts()).toHaveLength(2);
    expect(g.syncAxis("xy").getOptions().axis).toBe("xy");
    expect(g.syncCursor(false).getOptions().syncCursor).toBe(false);
    expect(g.syncSelection(true).getOptions().syncSelection).toBe(true);
    expect(g.syncPan(true)).toBe(g); // unchanged → early return
    g.syncPan(false); // changed → updateOptions
    expect(g.getOptions().syncPan).toBe(false);
    g.syncZoom(false); // changed → updateOptions
    expect(g.getOptions().syncZoom).toBe(false);
  });

  it("warns when adding a duplicate chart", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = createMockChart("a", B);
    const g = new ChartGroup();
    g.add(a);
    g.add(a);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("destroy cancels a pending raf timer", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", B, handlers);
    const b = createMockChart("b", B, handlers);
    const g = new ChartGroup({ axis: "x" });
    g.addAll(a, b);
    a.emit("zoom", { x: [10, 90], y: [0, 50] }); // schedules a raf
    g.destroy();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it("destroy clears a pending debounce timer", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", B, handlers);
    const b = createMockChart("b", B, handlers);
    const g = new ChartGroup({ axis: "x", debounce: 50 });
    g.addAll(a, b);
    a.emit("zoom", { x: [10, 90], y: [0, 50] });
    g.destroy();
    vi.advanceTimersByTime(50);
    expect(b.zoom).not.toHaveBeenCalled();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fitAll with explicit x applies shared bounds to every chart", () => {
    const a = { getId: () => "a", getViewBounds: () => ({ ...B }), fit: vi.fn(), zoom: vi.fn(), pan: vi.fn(), on: vi.fn(), off: vi.fn() };
    const b = { getId: () => "b", getViewBounds: () => ({ ...B }), fit: vi.fn(), zoom: vi.fn(), pan: vi.fn(), on: vi.fn(), off: vi.fn() };
    const g = new ChartGroup({ axis: "x" });
    g.addAll(a, b);
    g.fitAll({ x: [5, 95], padding: 10 });
    expect(a.fit).toHaveBeenCalledWith({ x: [5, 95], padding: 10 });
    expect(b.fit).toHaveBeenCalledWith({ x: [5, 95], padding: 10 });
  });

  it("fitAll without masterId derives shared X from the first chart", () => {
    const a = { getId: () => "a", getViewBounds: () => ({ xMin: 10, xMax: 90, yMin: 0, yMax: 5 }), fit: vi.fn(), zoom: vi.fn(), pan: vi.fn(), on: vi.fn(), off: vi.fn() };
    const b = { getId: () => "b", getViewBounds: () => ({ ...B }), fit: vi.fn(), zoom: vi.fn(), pan: vi.fn(), on: vi.fn(), off: vi.fn() };
    const g = new ChartGroup({ axis: "x" });
    g.addAll(a, b);
    g.fitAll();
    // With no masterId the first chart both seeds shared X and is re-fit in the loop.
    expect(a.fit).toHaveBeenCalled();
    expect(b.fit).toHaveBeenCalledWith(expect.objectContaining({ x: [10, 90] }));
  });

  it("fitAll tolerates a master with invalid bounds and charts without fit", () => {
    const master = { getId: () => "m", getViewBounds: () => ({ xMin: 0, xMax: Infinity, yMin: 0, yMax: 0 }), fit: vi.fn(), zoom: vi.fn(), pan: vi.fn(), on: vi.fn(), off: vi.fn() };
    const noFit = createMockChart("nf", B); // no fit method
    const withFit = { getId: () => "wf", getViewBounds: () => ({ ...B }), fit: vi.fn(), zoom: vi.fn(), pan: vi.fn(), on: vi.fn(), off: vi.fn() };
    const g = new ChartGroup({ axis: "x", masterId: "m" });
    g.addAll(master, noFit, withFit);
    g.fitAll();
    // master fit ran; invalid bounds → no shared X; non-fit chart skipped; wf fit ran
    expect(master.fit).toHaveBeenCalled();
    expect(withFit.fit).toHaveBeenCalledWith({ padding: undefined });
  });

  it("syncTo without an exclude id and inside a batch", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", B, handlers);
    const b = createMockChart("b", B, handlers);
    const g = new ChartGroup({ axis: "x" });
    g.addAll(a, b);
    g.syncTo({ xMin: 5, xMax: 95 }); // no excludeChartId → '' fallback
    expect(a.zoom).toHaveBeenCalled();
    expect(b.zoom).toHaveBeenCalled();
    // propagateZoom is a no-op while a batch is in progress
    (a.zoom as ReturnType<typeof vi.fn>).mockClear();
    g.batch(() => g.syncTo({ xMin: 1, xMax: 2 }));
    expect(a.zoom).not.toHaveBeenCalled();
  });

  it("event handlers are inert while updating (batch)", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = { ...createMockChart("a", B, handlers), setExternalCursor: vi.fn() };
    const b = { ...createMockChart("b", B, handlers), setExternalCursor: vi.fn(), selectPoints: vi.fn() };
    const g = new ChartGroup({ axis: "x", syncCursor: true, syncSelection: true });
    g.addAll(a, b);
    g.batch(() => {
      a.emit("zoom", { x: [10, 90], y: [0, 50] });
      a.emit("pan", { deltaX: 5, deltaY: 0 });
      a.emit("hover", { point: { x: 1, y: 2 } });
      a.emit("selectionChange", { selected: [{ seriesId: "s", indices: [0] }] });
    });
    flushRaf();
    expect(b.zoom).not.toHaveBeenCalled();
    expect(b.setExternalCursor).not.toHaveBeenCalled();
    expect(b.selectPoints).not.toHaveBeenCalled();
  });

  it("pan with zero delta on the active axis does nothing", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", B, handlers);
    const b = createMockChart("b", B, handlers);
    const g = new ChartGroup({ axis: "x", syncPan: true });
    g.addAll(a, b);
    a.emit("pan", { deltaX: 0, deltaY: 5 }); // axis x → dx=0, dy forced 0
    flushRaf();
    expect(b.zoom).not.toHaveBeenCalled();
  });

  it("selection falls back to empty array without a source getter", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", B, handlers); // no getSelectedPoints
    const b = { ...createMockChart("b", B, handlers), clearSelection: vi.fn(), selectPoints: vi.fn() };
    const g = new ChartGroup({ syncSelection: true, axis: "x" });
    g.addAll(a, b);
    a.emit("selectionChange", {}); // no payload, no getter → []
    expect(b.clearSelection).toHaveBeenCalled();
  });

  it("coalesces duplicate raf-scheduled zoom actions", () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", B, handlers);
    const b = createMockChart("b", B, handlers);
    const g = new ChartGroup({ axis: "x" });
    g.addAll(a, b);
    a.emit("zoom", { x: [10, 90], y: [0, 50] });
    a.emit("zoom", { x: [20, 80], y: [0, 50] }); // same key → dedup, no second raf
    flushRaf();
    expect(b.zoom).toHaveBeenCalledTimes(1);
  });

  it("debounce resets the timer when actions arrive quickly", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const a = createMockChart("a", B, handlers);
    const b = createMockChart("b", B, handlers);
    const g = new ChartGroup({ axis: "x", debounce: 50 });
    g.addAll(a, b);
    a.emit("zoom", { x: [10, 90], y: [0, 50] });
    vi.advanceTimersByTime(20);
    a.emit("zoom", { x: [20, 80], y: [0, 50] }); // clears prior timer
    vi.advanceTimersByTime(50);
    expect(b.zoom).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
