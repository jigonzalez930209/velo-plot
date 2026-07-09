import { describe, it, expect, vi } from "vitest";
import {
  optionsChanged,
  syncChartOptions,
  pickSyncableOptions,
} from "./optionsSync";
import { buildMockChart } from "../test-utils";

describe("optionsSync", () => {
  it("pickSyncableOptions copies defined sync keys", () => {
    expect(
      pickSyncableOptions({
        theme: "dark",
        animations: false,
        container: document.createElement("div"),
      } as never),
    ).toEqual({ theme: "dark", animations: false });
  });

  it("optionsChanged detects axis, legend, and layout changes", () => {
    expect(
      optionsChanged({ xAxis: { type: "linear" } }, { xAxis: { type: "log" } }),
    ).toBe(true);
    expect(
      optionsChanged({ showLegend: true }, { showLegend: false }),
    ).toBe(true);
    expect(
      optionsChanged({ layout: { padding: 1 } }, { layout: { padding: 2 } }),
    ).toBe(true);
    expect(optionsChanged({}, {})).toBe(false);
  });

  it("syncChartOptions updates axes, theme, background, legend, and resize", () => {
    const chart = {
      ...buildMockChart(),
      setShowLegend: vi.fn(),
    };
    syncChartOptions(
      chart,
      {
        xAxis: { type: "linear" },
        yAxis: { id: "y1", type: "linear" },
        theme: "dark",
        background: "#000",
        showLegend: true,
        layout: { padding: 1 },
        responsive: { reducedMotion: "auto" },
      },
      {
        xAxis: { type: "log" },
        yAxis: [{ id: "y1", type: "log" }, { id: "y2", type: "linear" }],
        theme: "light",
        background: "#111",
        showLegend: false,
        layout: { padding: 2 },
        responsive: { reducedMotion: "reduce" },
      },
    );
    expect(chart.updateXAxis).toHaveBeenCalled();
    expect(chart.updateYAxis).toHaveBeenCalledWith("y1", expect.any(Object));
    expect(chart.setTheme).toHaveBeenCalledWith("light");
    expect(chart.setTheme).toHaveBeenCalledWith({ backgroundColor: "#111" });
    expect(chart.setShowLegend).toHaveBeenCalledWith(false);
    expect(chart.resize).toHaveBeenCalled();
  });

  it("skips unchanged axes and charts without setShowLegend", () => {
    const chart = buildMockChart();
    syncChartOptions(chart, { xAxis: { type: "linear" } }, { xAxis: { type: "linear" } });
    syncChartOptions(
      chart,
      { yAxis: { id: "y1", type: "linear" } },
      { yAxis: { type: "linear" } },
    );
    expect(chart.updateYAxis).not.toHaveBeenCalled();
  });

  it("optionsChanged covers remaining sync keys", () => {
    expect(optionsChanged({ colorScheme: "neon" }, { colorScheme: "pastel" })).toBe(true);
    expect(optionsChanged({ toolbar: true }, { toolbar: false })).toBe(true);
    expect(optionsChanged({ animations: true }, { animations: false })).toBe(true);
    expect(optionsChanged({ showControls: true }, { showControls: false })).toBe(true);
  });

  it("shallowEqual handles null and mismatched keys", () => {
    expect(optionsChanged({ xAxis: { type: "linear" } }, { xAxis: null as never })).toBe(true);
    expect(optionsChanged({ layout: { padding: 1 } }, { layout: { padding: 1, margin: 0 } as never })).toBe(true);
  });

  it("syncChartOptions skips yAxis without id and charts lacking setShowLegend", () => {
    const chart = buildMockChart();
    syncChartOptions(
      chart,
      { yAxis: { type: "linear" } },
      { yAxis: [{ type: "linear" }, { id: "y2", type: "log" }] },
    );
    expect(chart.updateYAxis).toHaveBeenCalledWith("y2", expect.any(Object));
    syncChartOptions(chart, { showLegend: true }, { showLegend: false });
    expect(chart.setShowLegend).toBeUndefined();
  });
});
