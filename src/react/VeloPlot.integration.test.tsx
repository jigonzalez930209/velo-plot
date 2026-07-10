import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { VeloPlot } from "./VeloPlot";
import { buildMockChart } from "../bindings/test-utils";

const mockChart = buildMockChart();

vi.mock("../bindings/shared/chartLifecycle", () => ({
  createChartLifecycle: vi.fn(() => ({
    chart: mockChart,
    getBounds: () => mockChart.getViewBounds(),
    destroy: mockChart.destroy,
  })),
}));

describe("VeloPlot integration", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("cleans up a11y overlay on unmount with keyboard nav", async () => {
    const { container, unmount } = render(
      <VeloPlot
        keyboardNav
        ariaLabel="Live chart"
        series={[{ id: "s", x: new Float32Array([0]), y: new Float32Array([1]) }]}
      />,
    );
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());
    unmount();
    expect(container.innerHTML).not.toContain("table");
  });

  it("reapplies a11y when keyboardNav toggles", async () => {
    const { container, rerender } = render(
      <VeloPlot
        keyboardNav={false}
        ariaLabel="Chart"
        series={[{ id: "a", x: new Float32Array([0]), y: new Float32Array([1]) }]}
      />,
    );
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());
    rerender(
      <VeloPlot
        keyboardNav
        ariaLabel="Chart"
        series={[{ id: "a", x: new Float32Array([0]), y: new Float32Array([1]) }]}
      />,
    );
    await waitFor(() => expect(container.querySelector("table")).toBeTruthy());
  });

  it("renders with real hook wiring and numeric dimensions", async () => {
    const { container } = render(
      <VeloPlot
        width={640}
        height={320}
        className="live"
        keyboardNav={false}
        series={[{ id: "s", x: new Float32Array([0, 1]), y: new Float32Array([0, 1]) }]}
        theme="dark"
      />,
    );
    await waitFor(() => expect(container.querySelector(".velo-plot-container.live")).toBeTruthy());
    expect(mockChart.addSeries).toHaveBeenCalled();
  });
});
