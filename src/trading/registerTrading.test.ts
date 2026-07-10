import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChartImpl } from "../core/chart/ChartCore";
import { registerTradingBundle, patchChartTradingMethods } from "./registerTrading";
import * as addIndicatorModule from "../core/indicator/addIndicator";

vi.mock("../core/indicator/addIndicator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../core/indicator/addIndicator")>();
  return {
    ...actual,
    addIndicatorToChart: vi.fn(async () => ({
      id: "rsi",
      preset: "rsi",
      placement: "overlay" as const,
      seriesIds: ["rsi"],
    })),
  };
});

import "./registerTrading";

function makeTradingChart() {
  const events = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  const seriesEntry = {
    getId: () => "ohlc",
    getData: () => ({
      x: Float32Array.from([0, 1]),
      close: Float32Array.from([99, 101]),
    }),
  };
  const chart = Object.create(ChartImpl.prototype) as ChartImpl & {
    events: typeof events;
    series: Map<string, unknown>;
    addAnnotation: ReturnType<typeof vi.fn>;
    getPlugin: ReturnType<typeof vi.fn>;
    setFeatureHooks: ReturnType<typeof vi.fn>;
    destroy: () => void;
  };
  chart.events = events;
  chart.series = new Map([["ohlc", seriesEntry]]);
  chart.addAnnotation = vi.fn();
  chart.getPlugin = vi.fn();
  chart.setFeatureHooks = vi.fn();
  return chart;
}

describe("registerTradingBundle", () => {
  beforeEach(() => {
    vi.mocked(addIndicatorModule.addIndicatorToChart).mockClear();
  });

  it("is idempotent when called again", () => {
    expect(() => registerTradingBundle()).not.toThrow();
  });

  it("patches addIndicator onto ChartImpl", async () => {
    const chart = makeTradingChart();
    const result = await chart.addIndicator("rsi", { period: 14 });
    expect(addIndicatorModule.addIndicatorToChart).toHaveBeenCalledWith(chart, "rsi", {
      period: 14,
    });
    expect(result.preset).toBe("rsi");
  });

  it("manages price alerts via chart methods", () => {
    const chart = makeTradingChart();
    const id = chart.addAlert({ price: 100, direction: "above" });
    expect(id).toBeTruthy();
    expect(chart.getAlerts()).toHaveLength(1);
    expect(chart.removeAlert(id)).toBe(true);
    chart.addAlert({ price: 50, direction: "below" });
    chart.clearAlerts();
    expect(chart.getAlerts()).toHaveLength(0);
    expect(chart.setFeatureHooks).toHaveBeenCalled();
  });

  it("addPositionLine assigns incremental ids and adds annotation", () => {
    const chart = makeTradingChart();
    const a = chart.addPositionLine({ price: 10, label: "Entry" });
    const b = chart.addPositionLine({ id: "custom", price: 20, label: "Exit" });
    expect(a).toMatch(/^position-/);
    expect(b).toBe("custom");
    expect(chart.addAnnotation).toHaveBeenCalledTimes(2);
  });

  it("setDrawingMode delegates to drawing tools plugin when present", () => {
    const chart = makeTradingChart();
    const setMode = vi.fn();
    chart.getPlugin.mockReturnValue({ setMode });
    chart.setDrawingMode("trendline");
    expect(setMode).toHaveBeenCalledWith("trendline");
  });

  it("setDrawingMode is safe when plugin is missing", () => {
    const chart = makeTradingChart();
    chart.getPlugin.mockReturnValue(undefined);
    expect(() => chart.setDrawingMode("horizontal")).not.toThrow();
  });

  it("evaluates alerts against the first series when seriesId is omitted", () => {
    const chart = makeTradingChart();
    chart.addAlert({ price: 100, direction: "above" });
    const hooks = chart.setFeatureHooks.mock.calls[0][0];
    hooks.onDataUpdate();
    expect(chart.events.emit).toHaveBeenCalled();
  });

  it("evaluates alerts against an explicit series id", () => {
    const chart = makeTradingChart();
    chart.addAlert({ price: 100, direction: "above", seriesId: "ohlc" });
    const hooks = chart.setFeatureHooks.mock.calls[0][0];
    hooks.onDataUpdate();
    expect(chart.events.emit).toHaveBeenCalled();
  });

  it("evaluates alerts using the first series when seriesId is unknown", () => {
    const chart = makeTradingChart();
    chart.addAlert({ price: 100, direction: "above", seriesId: "missing" });
    const hooks = chart.setFeatureHooks.mock.calls[0][0];
    hooks.onDataUpdate();
    expect(chart.events.emit).toHaveBeenCalled();
  });

  it("feature hooks expose alerts and tear down the manager", () => {
    const chart = makeTradingChart();
    chart.addAlert({ price: 50, direction: "below" });
    const hooks = chart.setFeatureHooks.mock.calls[0][0];
    expect(hooks.getAlerts()).toHaveLength(1);
    (chart as { _alertManager?: unknown })._alertManager = undefined;
    expect(hooks.getAlerts()).toEqual([]);
    hooks.destroy();
  });

  it("patchChartTradingMethods is idempotent", () => {
    expect(() => patchChartTradingMethods()).not.toThrow();
  });

  it("skips re-patching when the chart prototype was already patched", async () => {
    const proto = ChartImpl.prototype as { _tradingPatched?: boolean };
    expect(proto._tradingPatched).toBe(true);
    vi.resetModules();
    await import("./registerTrading");
    expect(proto._tradingPatched).toBe(true);
  });

  it("destroy clears alert manager via patched destroy", () => {
    const chart = makeTradingChart() as any;
    chart.addAlert({ price: 1, direction: "above" });
    const mgrDestroy = vi.spyOn(chart._alertManager, "destroy");
    chart.renderLoop = { cancelPendingRender: vi.fn() };
    chart.animationEngine = { destroy: vi.fn() };
    chart.selectionManager = { destroy: vi.fn() };
    chart.responsiveManager = { destroy: vi.fn() };
    chart.interaction = { destroy: vi.fn() };
    chart.pluginManager = { destroy: vi.fn() };
    chart.renderer = { destroy: vi.fn(), deleteBuffer: vi.fn() };
    chart.container = { firstChild: null, removeChild: vi.fn() };
    chart.series = new Map();
    chart.controls = null;
    chart.legend = null;
    chart.featureHooks = null;

    chart.destroy();

    expect(mgrDestroy).toHaveBeenCalled();
    expect(chart._alertManager).toBeUndefined();
    expect(chart.setFeatureHooks).toHaveBeenCalledWith(null);
  });
});
