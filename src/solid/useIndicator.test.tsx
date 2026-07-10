import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRoot } from "solid-js";
import { useIndicator } from "./useIndicator";
import { buildMockChart } from "../bindings/test-utils";

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    addIndicatorToHost: vi.fn(async () => ({ id: "ema", seriesIds: ["ema"] })),
    removeIndicatorFromChart: vi.fn(),
    isStackedChart: vi.fn(() => false),
  };
});

describe("useIndicator solid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads indicator and cleans up", async () => {
    const chart = buildMockChart();
    let disposeFn: (() => void) | undefined;
    createRoot((dispose) => {
      disposeFn = dispose;
      useIndicator(() => chart, "ema");
    });
    await Promise.resolve();
    disposeFn?.();
    const { removeIndicatorFromChart } = await import("../bindings/shared");
    expect(removeIndicatorFromChart).toHaveBeenCalled();
  });

  it("records errors", async () => {
    const { addIndicatorToHost } = await import("../bindings/shared");
    vi.mocked(addIndicatorToHost).mockRejectedValue(new Error("solid fail"));
    let readError = () => "";
    const dispose = createRoot((disposeFn) => {
      const { error } = useIndicator(() => buildMockChart(), "rsi");
      readError = () => error()?.message ?? "";
      return disposeFn;
    });
    await vi.waitFor(() => expect(readError()).toBe("solid fail"), { timeout: 1000 });
    dispose();
  });

  it("skips cleanup for stacked hosts", async () => {
    const { isStackedChart, removeIndicatorFromChart } = await import("../bindings/shared");
    vi.mocked(isStackedChart).mockReturnValue(true);
    const chart = buildMockChart();
    let disposeFn: (() => void) | undefined;
    createRoot((dispose) => {
      disposeFn = dispose;
      useIndicator(() => chart, "ema");
    });
    await Promise.resolve();
    disposeFn?.();
    expect(removeIndicatorFromChart).not.toHaveBeenCalled();
  });

  it("skips when host is null", async () => {
    let readLoading = () => false;
    const dispose = createRoot((disposeFn) => {
      const { isLoading } = useIndicator(() => null, "rsi");
      readLoading = isLoading;
      return disposeFn;
    });
    expect(readLoading()).toBe(false);
    dispose();
  });

  it("wraps non-error rejections", async () => {
    const { addIndicatorToHost } = await import("../bindings/shared");
    vi.mocked(addIndicatorToHost).mockRejectedValue("plain failure");
    let readError = () => "";
    const dispose = createRoot((disposeFn) => {
      const { error } = useIndicator(() => buildMockChart(), "macd");
      readError = () => error()?.message ?? "";
      return disposeFn;
    });
    await vi.waitFor(() => expect(readError()).toBe("plain failure"));
    dispose();
  });
});
