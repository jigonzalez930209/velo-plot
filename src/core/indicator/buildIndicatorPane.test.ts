import { describe, it, expect } from "vitest";
import { buildIndicatorPane } from "./buildIndicatorPane";

describe("buildIndicatorPane", () => {
  const x = [0, 1, 2, 3, 4];

  it("creates a stacked pane with indicator series expanded", () => {
    const pane = buildIndicatorPane({
      id: "rsi",
      label: "RSI",
      yRange: [0, 100],
      data: {
        x,
        lines: [{ id: "rsi", y: [30, 50, 70, 40, 60], color: "#0f0" }],
      },
    });

    expect(pane.id).toBe("rsi");
    expect(pane.height).toBe(0.25);
    expect(pane.yRange).toEqual([0, 100]);
    expect(pane.series?.length).toBeGreaterThan(0);
    expect(pane.chart?.yAxis).toMatchObject({ label: "RSI", scientific: false });
    expect(pane.showXAxis).toBeUndefined();
  });

  it("respects custom height and showXAxis", () => {
    const pane = buildIndicatorPane({
      id: "macd",
      height: 0.3,
      showXAxis: true,
      data: {
        x,
        histogram: { y: [1, -1, 2, -2, 1], positiveColor: "#0a0", negativeColor: "#a00" },
        lines: [{ id: "macd", y: [0, 1, 0, -1, 0] }],
      },
    });

    expect(pane.height).toBe(0.3);
    expect(pane.showXAxis).toBe(true);
    expect(pane.series!.length).toBeGreaterThanOrEqual(2);
  });
});
