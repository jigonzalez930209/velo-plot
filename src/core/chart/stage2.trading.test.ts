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
});
