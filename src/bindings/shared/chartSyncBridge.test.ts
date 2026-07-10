import { describe, it, expect, vi } from "vitest";
import { createChartSync, updateChartSync } from "./chartSyncBridge";
import { buildMockChart } from "../test-utils";

const destroy = vi.fn();
const mockGroup = { destroy };

vi.mock("../../core/sync", () => ({
  ChartGroup: vi.fn(function ChartGroup() {
    return mockGroup;
  }),
  createChartGroup: vi.fn(() => mockGroup),
}));

describe("chartSyncBridge", () => {
  it("createChartSync returns group and destroy", () => {
    const charts = [buildMockChart("a"), buildMockChart("b")];
    const handle = createChartSync(charts, { axis: "x" });
    expect(handle.group).toBe(mockGroup);
    handle.destroy();
    expect(destroy).toHaveBeenCalled();
  });

  it("updateChartSync destroys previous handle and skips single chart", () => {
    const prev = { group: mockGroup, destroy: vi.fn() };
    const single = updateChartSync(prev, [buildMockChart()]);
    expect(prev.destroy).toHaveBeenCalled();
    expect(single.group).toBeTruthy();
    single.destroy();
  });

  it("updateChartSync recreates sync for two charts", () => {
    const charts = [buildMockChart("a"), buildMockChart("b")];
    const handle = updateChartSync(null, charts);
    expect(handle.group).toBe(mockGroup);
  });
});
