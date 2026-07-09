import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { StackedPlot } from "./StackedPlot";

const mockDestroy = vi.fn();
const mockMaster = { getViewBounds: () => ({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }) };
const mockStack = {
  destroy: mockDestroy,
  whenReady: vi.fn().mockResolvedValue(undefined),
  fitAll: vi.fn(),
  resetAll: vi.fn(),
  getMaster: () => mockMaster,
  getPanes: () => [],
};

vi.mock("../core/stacked", () => ({
  createStackedChart: vi.fn(() => mockStack),
}));

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    stackedStructureKey: () => "price|volume",
    syncStackedPaneSeries: () => new Map(),
    syncStackedOptions: vi.fn(),
  };
});

vi.mock("./useStackedPlot", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./useStackedPlot")>();
  return {
    ...actual,
    useStackedPlot: vi.fn(actual.useStackedPlot),
  };
});

describe("StackedPlot", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("returns null bounds when stack is unavailable", async () => {
    const { useStackedPlot } = await import("./useStackedPlot");
    vi.mocked(useStackedPlot).mockReturnValueOnce({
      containerRef: { current: null },
      stack: null,
      isReady: false,
      fitAll: vi.fn(),
      resetAll: vi.fn(),
    });
    const ref = { current: null as import("./StackedPlot").StackedPlotRef | null };
    render(
      <StackedPlot
        ref={(r) => { ref.current = r; }}
        panes={[{ id: "p", height: 1, series: [] }]}
        height="50%"
        width={600}
      />,
    );
    expect(ref.current?.getBounds()).toBeNull();
  });

  it("renders stacked container and ref API", async () => {
    const ref = { current: null as import("./StackedPlot").StackedPlotRef | null };
    const { container } = render(
      <StackedPlot
        ref={(r) => { ref.current = r; }}
        panes={[
          { id: "price", height: 0.7, series: [] },
          { id: "volume", height: 0.3, series: [] },
        ]}
        width="100%"
        height={400}
      />,
    );
    await waitFor(() => expect(container.querySelector(".velo-plot-stacked")).toBeTruthy());
    ref.current?.fitAll();
    ref.current?.resetAll();
    expect(mockStack.fitAll).toHaveBeenCalled();
    expect(ref.current?.getBounds()).toEqual(mockMaster.getViewBounds());
    expect(ref.current?.getStack()).toBe(mockStack);
  });
});
