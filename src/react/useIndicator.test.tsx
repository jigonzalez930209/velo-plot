import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { useIndicator } from "./useIndicator";
import { buildMockChart } from "../bindings/test-utils";

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    addIndicatorToHost: vi.fn(),
    isStackedChart: vi.fn(() => false),
    removeIndicatorFromChart: vi.fn(),
  };
});

describe("useIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads indicator result", async () => {
    const { addIndicatorToHost } = await import("../bindings/shared");
    vi.mocked(addIndicatorToHost).mockResolvedValue({
      id: "rsi",
      preset: "rsi",
      placement: "overlay",
      seriesIds: ["rsi"],
    });
    function Harness() {
      const chart = buildMockChart();
      const { result, isLoading } = useIndicator(chart, "rsi", { period: 14 });
      return (
        <span data-testid="state">
          {isLoading ? "loading" : result ? result.id : "none"}
        </span>
      );
    }
    const { getByTestId } = render(<Harness />);
    await waitFor(() => expect(getByTestId("state").textContent).toBe("rsi"));
  });

  it("surfaces errors and cleans up on unmount", async () => {
    const { addIndicatorToHost, removeIndicatorFromChart, isStackedChart } =
      await import("../bindings/shared");
    vi.mocked(addIndicatorToHost).mockRejectedValue(new Error("boom"));
    function ErrHarness() {
      const chart = buildMockChart();
      const { error } = useIndicator(chart, "macd");
      return <span data-testid="err">{error?.message ?? ""}</span>;
    }
    const { getByTestId, unmount } = render(<ErrHarness />);
    await waitFor(() => expect(getByTestId("err").textContent).toBe("boom"));
    unmount();

    vi.mocked(addIndicatorToHost).mockResolvedValue({
      id: "ema",
      preset: "ema",
      placement: "overlay",
      seriesIds: ["ema"],
    });
    function CleanupHarness() {
      const chart = buildMockChart();
      useIndicator(chart, "ema");
      return null;
    }
    const { unmount: unmount2 } = render(<CleanupHarness />);
    await waitFor(() => expect(addIndicatorToHost).toHaveBeenCalled());
    unmount2();
    expect(removeIndicatorFromChart).toHaveBeenCalled();

    vi.mocked(isStackedChart).mockReturnValue(true);
    const { unmount: unmount3 } = render(<CleanupHarness />);
    await waitFor(() => expect(addIndicatorToHost).toHaveBeenCalled());
    unmount3();
  });

  it("skips when host is null", () => {
    function NullHarness() {
      const { isLoading } = useIndicator(null, "rsi");
      return <span data-testid="loading">{isLoading ? "yes" : "no"}</span>;
    }
    const { getByTestId } = render(<NullHarness />);
    expect(getByTestId("loading").textContent).toBe("no");
  });

  it("wraps non-error rejections", async () => {
    const { addIndicatorToHost } = await import("../bindings/shared");
    vi.mocked(addIndicatorToHost).mockRejectedValue("plain failure");
    function ErrHarness() {
      const { error } = useIndicator(buildMockChart(), "macd");
      return <span data-testid="err">{error?.message ?? ""}</span>;
    }
    const { getByTestId } = render(<ErrHarness />);
    await waitFor(() => expect(getByTestId("err").textContent).toBe("plain failure"));
  });
});
