import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { useChartSync } from "./useChartSync";

const mockDestroy = vi.fn();
const mockGroup = { destroy: mockDestroy };

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    createChartSync: vi.fn(() => ({
      group: mockGroup,
      destroy: mockDestroy,
    })),
  };
});

function SyncHarness({ count, options }: { count: number; options?: { axis: "x" | "y" | "xy" } }) {
  const charts = Array.from({ length: count }, (_, i) => ({
    getId: () => `c${i}`,
    getViewBounds: () => ({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }),
    zoom: vi.fn(),
    pan: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }));
  const { group } = useChartSync(charts, options);
  return <span data-testid="group">{group ? "synced" : "none"}</span>;
}

describe("useChartSync", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("recreates sync when options change", async () => {
    function OptHarness({ axis }: { axis: "x" | "y" }) {
      const charts = [
        {
          getId: () => "a",
          getViewBounds: () => ({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }),
          zoom: vi.fn(),
          pan: vi.fn(),
          on: vi.fn(),
          off: vi.fn(),
        },
        {
          getId: () => "b",
          getViewBounds: () => ({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }),
          zoom: vi.fn(),
          pan: vi.fn(),
          on: vi.fn(),
          off: vi.fn(),
        },
      ];
      useChartSync(charts, { axis });
      return <span data-testid="group">synced</span>;
    }
    const { rerender } = render(<OptHarness axis="x" />);
    rerender(<OptHarness axis="y" />);
    await waitFor(() => expect(mockDestroy).toHaveBeenCalled());
  });

  it("destroys sync handle on effect cleanup", async () => {
    const { unmount, getByTestId } = render(<SyncHarness count={2} />);
    await waitFor(() => expect(getByTestId("group").textContent).toBe("synced"));
    unmount();
    expect(mockDestroy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("promotes from single chart to sync group", async () => {
    function DynamicHarness({ count }: { count: number }) {
      const charts = Array.from({ length: count }, (_, i) => ({
        getId: () => `c${i}`,
        getViewBounds: () => ({ xMin: 0, xMax: 1, yMin: 0, yMax: 1 }),
        zoom: vi.fn(),
        pan: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      }));
      const { group } = useChartSync(charts);
      return <span data-testid="group">{group ? "synced" : "none"}</span>;
    }
    const { rerender, getByTestId } = render(<DynamicHarness count={1} />);
    expect(getByTestId("group").textContent).toBe("none");
    rerender(<DynamicHarness count={2} />);
    await waitFor(() => expect(getByTestId("group").textContent).toBe("synced"));
  });

  it("creates sync group for 2+ charts with options", async () => {
    const { createChartSync } = await import("../bindings/shared");
    const { getByTestId } = render(<SyncHarness count={2} options={{ axis: "x" }} />);
    await waitFor(() => {
      expect(getByTestId("group").textContent).toBe("synced");
    });
    expect(createChartSync).toHaveBeenCalledWith(expect.any(Array), { axis: "x" });
  });

  it("destroys previous sync on rerender", async () => {
    const { rerender, getByTestId } = render(<SyncHarness count={2} />);
    await waitFor(() => expect(getByTestId("group").textContent).toBe("synced"));
    rerender(<SyncHarness count={3} />);
    await waitFor(() => expect(mockDestroy).toHaveBeenCalled());
  });

  it("destroys on unmount", async () => {
    const { unmount, getByTestId } = render(<SyncHarness count={2} />);
    await waitFor(() => expect(getByTestId("group").textContent).toBe("synced"));
    unmount();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it("demotes from sync group to single chart", async () => {
    const { rerender, getByTestId } = render(<SyncHarness count={2} />);
    await waitFor(() => expect(getByTestId("group").textContent).toBe("synced"));
    rerender(<SyncHarness count={1} />);
    await waitFor(() => expect(getByTestId("group").textContent).toBe("none"));
    expect(mockDestroy).toHaveBeenCalled();
  });

  it("skips sync for single chart", async () => {
    const { getByTestId } = render(<SyncHarness count={1} />);
    await waitFor(() => {
      expect(getByTestId("group").textContent).toBe("none");
    });
  });
});
