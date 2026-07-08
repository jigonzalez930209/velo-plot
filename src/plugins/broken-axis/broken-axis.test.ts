import { describe, it, expect, vi } from "vitest";
import { LinearScale } from "../../scales";
import { BrokenAxisScale } from "./BrokenAxisScale";
import { PluginBrokenAxis } from "./index";

/**
 * Audit test for task 3.15: confirms the broken-axis scale (listed in the
 * legacy roadmap) is fully implemented and maps values across a gap correctly.
 */
describe("BrokenAxisScale (3.15 audit)", () => {
  function makeScale() {
    const base = new LinearScale();
    base.setDomain(0, 100);
    base.setRange(0, 1000);
    // Collapse the 40..60 region into a small visual gap.
    return new BrokenAxisScale(base, [{ start: 40, end: 60, visualRatio: 0.05 }]);
  }

  it("keeps domain endpoints at the range extremes", () => {
    const scale = makeScale();
    scale.setRange(0, 1000);
    expect(scale.transform(0)).toBeCloseTo(0, 5);
    expect(scale.transform(100)).toBeCloseTo(1000, 5);
  });

  it("is monotonic increasing across the break", () => {
    const scale = makeScale();
    scale.setRange(0, 1000);
    const before = scale.transform(39);
    const after = scale.transform(61);
    expect(after).toBeGreaterThan(before);
  });

  it("compresses the broken region to roughly its visual ratio", () => {
    const scale = makeScale();
    scale.setRange(0, 1000);
    const gapPixels = scale.transform(60) - scale.transform(40);
    // The 20-unit data gap should render at ~5% of the 1000px range.
    expect(gapPixels).toBeLessThan(120);
    expect(gapPixels).toBeGreaterThan(0);
  });

  it("round-trips values outside the break via invert", () => {
    const scale = makeScale();
    scale.setRange(0, 1000);
    const px = scale.transform(20);
    expect(scale.invert(px)).toBeCloseTo(20, 4);
  });

  it("generates ticks within the domain", () => {
    const scale = makeScale();
    const ticks = scale.ticks(10);
    expect(ticks.length).toBeGreaterThan(0);
    expect(Math.min(...ticks)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(100);
  });
});

/**
 * Regression test for the root cause that made the whole plugin inert: ChartCore
 * exposes `brokenAxis` as a READ-ONLY getter (resolved via the plugin bridge), so
 * the old `chart.brokenAxis = api` assignment in onInit threw
 * "Cannot set property ... which has only a getter", aborting registration.
 */
describe("PluginBrokenAxis onInit against a read-only `brokenAxis` getter", () => {
  function makeChartMock() {
    const base = new LinearScale();
    base.setDomain(0, 100);
    base.setRange(0, 1000);
    const chart: any = {
      xScale: base,
      updateSeries: vi.fn(),
      addSeries: vi.fn(),
      appendData: vi.fn(),
      setXScale: vi.fn((s: any) => {
        chart.xScale = s;
      }),
    };
    // Mirror ChartCore: `brokenAxis` is a getter with no setter.
    Object.defineProperty(chart, "brokenAxis", {
      configurable: true,
      get: () => undefined,
    });
    return chart;
  }

  it("initializes without throwing and swaps in a BrokenAxisScale", () => {
    const chart = makeChartMock();
    const plugin = PluginBrokenAxis({
      axes: { default: { breaks: [{ start: 40, end: 60 }] } },
    });
    const ctx: any = { chart, requestRender: vi.fn() };

    expect(() => plugin.onInit?.(ctx, undefined as any)).not.toThrow();
    expect(chart.setXScale).toHaveBeenCalledTimes(1);
    expect(chart.xScale).toBeInstanceOf(BrokenAxisScale);
    // The plugin must expose its API via the returned `api` (not by assigning
    // to the read-only getter).
    expect((plugin as any).api).toBeTruthy();
  });

  it("restores the original scale and methods on destroy", () => {
    const chart = makeChartMock();
    const originalUpdate = chart.updateSeries;
    const plugin = PluginBrokenAxis({
      axes: { default: { breaks: [{ start: 40, end: 60 }] } },
    });
    const ctx: any = { chart, requestRender: vi.fn() };
    plugin.onInit?.(ctx, undefined as any);
    // onInit hijacks the mutators.
    const hijacked = chart.updateSeries;
    expect(hijacked).not.toBe(originalUpdate);

    plugin.onDestroy?.(ctx);
    expect(chart.xScale).toBeInstanceOf(LinearScale);
    // Destroy un-hijacks the mutators (restores the bound original wrapper).
    expect(chart.updateSeries).not.toBe(hijacked);
    chart.updateSeries("s", { x: new Float32Array([1]), y: new Float32Array([1]) });
    expect(originalUpdate).toHaveBeenCalled();
  });
});
