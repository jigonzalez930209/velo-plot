import { describe, it, expect, vi } from "vitest";
import {
  isStackedChart,
  addIndicatorToHost,
  removeIndicatorFromChart,
} from "./indicatorBridge";
import { buildMockChart } from "../test-utils";

vi.mock("../../core/indicator/addIndicator", () => ({
  addIndicatorToChart: vi.fn(async () => ({ id: "rsi", seriesIds: ["rsi-main"] })),
}));

describe("indicatorBridge", () => {
  it("isStackedChart detects stacked host", () => {
    expect(isStackedChart(null)).toBe(false);
    expect(isStackedChart(buildMockChart())).toBe(false);
    expect(isStackedChart({ getPanes: () => [] } as never)).toBe(true);
  });

  it("addIndicatorToHost throws when host is null", async () => {
    await expect(addIndicatorToHost(null, "rsi")).rejects.toThrow(/not ready/);
  });

  it("addIndicatorToHost uses chart path", async () => {
    const chart = buildMockChart();
    const { addIndicatorToChart } = await import("../../core/indicator/addIndicator");
    const result = await addIndicatorToHost(chart, "rsi");
    expect(addIndicatorToChart).toHaveBeenCalledWith(chart, "rsi", {});
    expect(result.id).toBe("rsi");
  });

  it("addIndicatorToHost uses stacked path", async () => {
    const stack = {
      getPanes: () => [],
      addIndicator: vi.fn(async () => ({ id: "macd", paneId: "p2" })),
    };
    const result = await addIndicatorToHost(stack as never, "macd");
    expect(stack.addIndicator).toHaveBeenCalled();
    expect(result.paneId).toBe("p2");
  });

  it("removeIndicatorFromChart removes root and child series", () => {
    const chart = buildMockChart();
    chart.getAllSeries.mockReturnValue([
      { getId: () => "rsi" },
      { getId: () => "rsi-signal" },
      { getId: () => "other" },
    ]);
    removeIndicatorFromChart(chart, "rsi");
    expect(chart.removeSeries).toHaveBeenCalledWith("rsi");
    expect(chart.removeSeries).toHaveBeenCalledWith("rsi-signal");
    expect(chart.removeSeries).not.toHaveBeenCalledWith("other");
  });
});
