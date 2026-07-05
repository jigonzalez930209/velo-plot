import { describe, it, expect, vi } from "vitest";
import {
  tickCountForPaneHeight,
  tickCountForPaneWidth,
  readBaseYTickCount,
  adaptPaneAxes,
  adaptAllPaneAxes,
} from "./paneAxis";

describe("paneAxis", () => {
  it("reduces Y ticks for short panes", () => {
    expect(tickCountForPaneHeight(40, 6)).toBe(2);
    expect(tickCountForPaneHeight(120, 6)).toBe(3);
    expect(tickCountForPaneHeight(300, 6)).toBe(6);
  });

  it("reduces X ticks for narrow panes", () => {
    expect(tickCountForPaneWidth(150, 8)).toBe(2);
    expect(tickCountForPaneWidth(600, 8)).toBe(8);
  });

  it("readBaseYTickCount defaults and reads first axis", () => {
    expect(readBaseYTickCount()).toBe(6);
    expect(readBaseYTickCount({ tickCount: 4 })).toBe(4);
    expect(readBaseYTickCount([{ tickCount: 3 }, { tickCount: 8 }])).toBe(3);
  });

  it("adaptPaneAxes updates chart tick counts from wrapper size", () => {
    const chart = {
      updateYAxis: vi.fn(),
      updateXAxis: vi.fn(),
    };
    const wrapper = { clientHeight: 72, clientWidth: 400 } as HTMLDivElement;

    adaptPaneAxes({
      chart: chart as never,
      wrapper,
      baseYTickCount: 6,
      baseXTickCount: 8,
      showXAxis: true,
    });

    expect(chart.updateYAxis).toHaveBeenCalledWith("default", { tickCount: 2 });
    expect(chart.updateXAxis).toHaveBeenCalledWith({ tickCount: 5 });
  });

  it("adaptAllPaneAxes iterates all metas", () => {
    const chart = { updateYAxis: vi.fn(), updateXAxis: vi.fn() };
    adaptAllPaneAxes([
      {
        chart: chart as never,
        wrapper: { clientHeight: 300, clientWidth: 600 } as HTMLDivElement,
        baseYTickCount: 6,
        baseXTickCount: 8,
        showXAxis: false,
      },
    ]);
    expect(chart.updateYAxis).toHaveBeenCalled();
    expect(chart.updateXAxis).not.toHaveBeenCalled();
  });
});
