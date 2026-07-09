import { describe, it, expect, afterEach } from "vitest";
import {
  createMockContainer,
  sampleLineData,
  sampleOhlcData,
  buildMockChart,
  expectDestroyCalled,
} from "./index";
import { createMockChartLifecycle, mockChartLifecycleModule } from "./mockLifecycle";

describe("bindings test-utils", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("creates mock container with dimensions", () => {
    const el = createMockContainer();
    expect(el.style.width).toBe("640px");
    expect(el.parentElement).toBe(document.body);
  });

  it("generates sample line and ohlc data", () => {
    const line = sampleLineData(4);
    expect(line.x.length).toBe(4);
    expect(line.y.length).toBe(4);
    const ohlc = sampleOhlcData(3);
    expect(ohlc.close.length).toBe(3);
  });

  it("builds mock chart with spies", () => {
    const chart = buildMockChart("custom");
    expect(chart.getId()).toBe("custom");
    chart.zoom({ x: [0, 1] });
    expect(chart.zoom).toHaveBeenCalled();
    chart.destroy();
    expectDestroyCalled(chart.destroy);
  });

  it("creates mock chart lifecycle helpers", () => {
    const lifecycle = createMockChartLifecycle();
    expect(lifecycle.handle.chart).toBe(lifecycle.chart);
    expect(lifecycle.handle.getBounds()).toEqual(lifecycle.chart.getViewBounds());
    lifecycle.destroy();
    expect(lifecycle.destroy).toHaveBeenCalled();
    const mod = mockChartLifecycleModule();
    expect(mod.createChartLifecycle()).toBe(mod.lifecycle.handle);
    expect(mod.pickSyncableOptions({ theme: "dark" })).toEqual({ theme: "dark" });
    expect(mod.optionsChanged()).toBe(false);
    mod.syncChartOptions({} as never, {}, {});
    expect(mod.syncChartOptions).toHaveBeenCalled();
  });
});
