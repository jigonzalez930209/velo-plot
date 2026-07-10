import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { VeloPlot } from "./VeloPlot";
import { buildMockChart } from "../bindings/test-utils";

const mockChart = buildMockChart();

vi.mock("../bindings/shared/chartLifecycle", () => ({
  createChartLifecycle: vi.fn(() => ({
    chart: mockChart,
    getBounds: () => mockChart.getViewBounds(),
    destroy: mockChart.destroy,
  })),
  pickSyncableOptions: (o: object) => o,
  optionsChanged: () => false,
  syncChartOptions: vi.fn(),
}));

describe("VeloPlot solid integration", () => {
  it("renders with string dimensions and syncs series", () => {
    const { container, unmount } = render(() =>
      VeloPlot({
        series: [{ id: "s", x: new Float32Array([0, 1]), y: new Float32Array([1, 2]) }],
        width: "50%",
        height: "200px",
        class: "solid-live",
      }),
    );
    expect(container.querySelector(".velo-plot-container.solid-live")).toBeTruthy();
    expect(mockChart.addSeries).toHaveBeenCalled();
    unmount();
    expect(mockChart.destroy).toHaveBeenCalled();
  });
});
