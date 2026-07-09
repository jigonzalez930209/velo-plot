import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { StackedPlot } from "./StackedPlot";
import { buildMockChart } from "../bindings/test-utils";

const mockStack = {
  destroy: vi.fn(),
  whenReady: vi.fn().mockResolvedValue(undefined),
  fitAll: vi.fn(),
  resetAll: vi.fn(),
  getMaster: () => buildMockChart(),
  getPane: vi.fn(() => ({
    addSeries: vi.fn(),
    updateSeries: vi.fn(),
    removeSeries: vi.fn(),
    autoScale: vi.fn(),
    getAllSeries: vi.fn(() => []),
  })),
  getPanes: () => [],
};

vi.mock("../core/stacked", () => ({
  createStackedChart: vi.fn(() => mockStack),
}));

describe("StackedPlot integration", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders stacked plot with ref API and aria label", async () => {
    const ref = { current: null as import("./StackedPlot").StackedPlotRef | null };
    const { getByRole } = render(
      <StackedPlot
        ref={(r) => { ref.current = r; }}
        panes={[{ id: "p", height: 1, series: [] }]}
        width={600}
        height={300}
        className="stack-live"
        ariaLabel="Custom stack"
        style={{ border: "1px solid red" }}
      />,
    );
    await waitFor(() => expect(document.querySelector('[data-ready="true"]')).toBeTruthy());
    ref.current?.fitAll();
    ref.current?.resetAll();
    expect(mockStack.fitAll).toHaveBeenCalled();
  });
});
