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
});
