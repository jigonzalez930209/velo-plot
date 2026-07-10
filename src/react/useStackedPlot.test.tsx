import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { useState } from "react";
import { useStackedPlot } from "./useStackedPlot";

const mockDestroy = vi.fn();
const mockStack = {
  destroy: mockDestroy,
  whenReady: vi.fn().mockResolvedValue(undefined),
  fitAll: vi.fn(),
  resetAll: vi.fn(),
  getPanes: () => [],
};

vi.mock("../core/stacked", () => ({
  createStackedChart: vi.fn(() => mockStack),
}));

let paneKey = "price|volume";

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    stackedStructureKey: () => paneKey,
    syncStackedPaneSeries: () => new Map(),
    syncStackedOptions: vi.fn(),
  };
});

function Harness() {
  const { containerRef, isReady } = useStackedPlot({
    panes: [
      { id: "price", height: 0.7, series: [] },
      { id: "volume", height: 0.3, series: [] },
    ],
  });
  return (
    <div>
      <div ref={containerRef} data-testid="stack" style={{ width: 400, height: 300 }} />
      <span data-testid="ready">{isReady ? "yes" : "no"}</span>
    </div>
  );
}

describe("useStackedPlot", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("skips mount when container is missing", async () => {
    const { createStackedChart } = await import("../core/stacked");
    function EmptyHarness() {
      useStackedPlot({ panes: [{ id: "p", height: 1, series: [] }] });
      return <span>empty</span>;
    }
    render(<EmptyHarness />);
    expect(createStackedChart).not.toHaveBeenCalled();
  });

  it("creates stack and destroys on unmount", async () => {
    const { getByTestId, unmount } = render(<Harness />);
    await waitFor(() => expect(getByTestId("ready").textContent).toBe("yes"));
    unmount();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it("remounts when pane structure changes", async () => {
    paneKey = "a";
    function ChangingHarness() {
      const [panes, setPanes] = useState([{ id: "a", height: 1, series: [] as never[] }]);
      const { containerRef, isReady } = useStackedPlot({ panes });
      return (
        <div>
          <div ref={containerRef} style={{ width: 400, height: 300 }} />
          <span data-testid="ready">{isReady ? "yes" : "no"}</span>
          <button type="button" onClick={() => { paneKey = "b"; setPanes([{ id: "b", height: 1, series: [] }]); }}>change</button>
        </div>
      );
    }
    const { getByText, getByTestId } = render(<ChangingHarness />);
    await waitFor(() => expect(getByTestId("ready").textContent).toBe("yes"));
    getByText("change").click();
    await waitFor(() => expect(mockDestroy.mock.calls.length).toBeGreaterThan(0));
  });

  it("syncs without remount when structure is unchanged", async () => {
    const { syncStackedOptions } = await import("../bindings/shared");
    paneKey = "same";
    function SyncHarness() {
      const { containerRef, isReady } = useStackedPlot({
        panes: [{ id: "p", height: 1, series: [] }],
        theme: "dark",
      });
      return (
        <div>
          <div ref={containerRef} style={{ width: 400, height: 300 }} />
          <span data-testid="ready">{isReady ? "yes" : "no"}</span>
        </div>
      );
    }
    const { getByTestId } = render(<SyncHarness />);
    await waitFor(() => expect(getByTestId("ready").textContent).toBe("yes"));
    expect(syncStackedOptions).toHaveBeenCalled();
  });
});
