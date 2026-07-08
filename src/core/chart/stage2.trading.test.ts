import { describe, it, expect, vi } from "vitest";
import { computeHeikinAshi } from "./heikinAshi";
import { findBarIndex, resolveMarkerY } from "./candlestickMarkers";
import { ChartAlertManager } from "./ChartAlerts";

describe("heikinAshi", () => {
  it("transforms OHLC to Heikin-Ashi values", () => {
    const n = 3;
    const open = Float32Array.from([10, 11, 12]);
    const high = Float32Array.from([12, 13, 14]);
    const low = Float32Array.from([9, 10, 11]);
    const close = Float32Array.from([11, 12, 13]);
    const ha = computeHeikinAshi({ open, high, low, close });
    expect(ha.close[0]).toBeCloseTo(10.5);
    expect(ha.open[1]).toBeCloseTo((ha.open[0] + ha.close[0]) / 2);
  });
});

describe("candlestickMarkers", () => {
  it("findBarIndex picks nearest x", () => {
    const x = Float32Array.from([100, 200, 300]);
    expect(findBarIndex(x, 210)).toBe(1);
  });

  it("resolveMarkerY respects position", () => {
    expect(resolveMarkerY("aboveBar", 12, 8, 10)).toBe(12);
    expect(resolveMarkerY("belowBar", 12, 8, 10)).toBe(8);
    expect(resolveMarkerY("inBar", 12, 8, 10)).toBe(10);
  });

  it("findBarIndex returns -1 for an empty series", () => {
    expect(findBarIndex(new Float32Array(0), 100)).toBe(-1);
  });
});

describe("ChartAlertManager", () => {
  const seriesFactory = (closes: number[]) => ({
    getId: () => "candles",
    getData: () => ({
      x: Float32Array.from(closes.map((_, i) => i)),
      close: Float32Array.from(closes),
    }),
  });

  it("emits alert when price crosses above threshold", () => {
    const events: unknown[] = [];
    const eventsMock = { emit: (_: string, e: unknown) => events.push(e) };
    const mgr = new ChartAlertManager(eventsMock as any, () => seriesFactory([99, 101]));

    mgr.addAlert({ price: 100, direction: "above" });
    mgr.evaluate();
    expect(events.length).toBe(1);
  });

  it("emits alert when price drops below threshold", () => {
    const events: unknown[] = [];
    const mgr = new ChartAlertManager({ emit: (_: string, e: unknown) => events.push(e) } as any, () =>
      seriesFactory([101, 98]),
    );
    mgr.addAlert({ price: 100, direction: "below" });
    mgr.evaluate();
    expect(events.length).toBe(1);
  });

  it("emits cross alert when price crosses level", () => {
    const events: unknown[] = [];
    const mgr = new ChartAlertManager({ emit: (_: string, e: unknown) => events.push(e) } as any, () =>
      seriesFactory([98, 102]),
    );
    mgr.addAlert({ price: 100, direction: "cross" });
    mgr.evaluate();
    expect(events.length).toBe(1);
  });

  it("removeAlert and clearAlerts manage registry", () => {
    const mgr = new ChartAlertManager({ emit: vi.fn() } as any, () => seriesFactory([100]));
    const id = mgr.addAlert({ price: 50, direction: "above" });
    expect(mgr.getAlerts()).toHaveLength(1);
    expect(mgr.removeAlert(id)).toBe(true);
    mgr.addAlert({ price: 60, direction: "below" });
    mgr.clearAlerts();
    expect(mgr.getAlerts()).toHaveLength(0);
  });

  it("uses custom alert id and repeats when once is false", () => {
    const emit = vi.fn();
    const mgr = new ChartAlertManager({ emit } as any, () => seriesFactory([101, 102]));
    mgr.addAlert({ id: "custom", price: 100, direction: "above", once: false });
    mgr.evaluate();
    mgr.evaluate();
    expect(emit).toHaveBeenCalledTimes(2);
    expect(mgr.getAlerts()).toHaveLength(1);
  });

  it("skips evaluation when series or prices are missing", () => {
    const emit = vi.fn();
    const mgr = new ChartAlertManager({ emit } as any, () => undefined);
    mgr.addAlert({ price: 1, direction: "above" });
    mgr.evaluate();
    expect(emit).not.toHaveBeenCalled();

    const empty = {
      getId: () => "e",
      getData: () => ({ x: new Float32Array(0), y: new Float32Array(0) }),
    };
    const mgr2 = new ChartAlertManager({ emit } as any, () => empty);
    mgr2.addAlert({ price: 1, direction: "below" });
    mgr2.evaluate();
    expect(emit).not.toHaveBeenCalled();
  });

  it("emits cross alert when price crosses downward", () => {
    const events: unknown[] = [];
    const mgr = new ChartAlertManager({ emit: (_: string, e: unknown) => events.push(e) } as any, () =>
      seriesFactory([102, 98]),
    );
    mgr.addAlert({ price: 100, direction: "cross" });
    mgr.evaluate();
    expect(events.length).toBe(1);
  });

  it("destroy clears pending alerts", () => {
    const mgr = new ChartAlertManager({ emit: vi.fn() } as any, () => seriesFactory([100]));
    mgr.addAlert({ price: 1, direction: "above" });
    mgr.destroy();
    expect(mgr.getAlerts()).toHaveLength(0);
  });

  it("skips evaluation when the latest price is not finite", () => {
    const emit = vi.fn();
    const mgr = new ChartAlertManager({ emit } as any, () => seriesFactory([100, NaN]));
    mgr.addAlert({ price: 50, direction: "above" });
    mgr.evaluate();
    expect(emit).not.toHaveBeenCalled();
  });

  it("uses the single price as its own previous value for cross alerts", () => {
    const emit = vi.fn();
    // one data point → prev falls back to latest; no cross can be detected
    const mgr = new ChartAlertManager({ emit } as any, () => seriesFactory([100]));
    mgr.addAlert({ price: 100, direction: "cross" });
    mgr.evaluate();
    expect(emit).not.toHaveBeenCalled();
  });

  it("does not emit when the condition is not met", () => {
    const emit = vi.fn();
    const mgr = new ChartAlertManager({ emit } as any, () => seriesFactory([90, 95]));
    mgr.addAlert({ price: 100, direction: "above" });
    mgr.evaluate();
    expect(emit).not.toHaveBeenCalled();
    // alert remains because it never triggered
    expect(mgr.getAlerts()).toHaveLength(1);
  });
});
