import { describe, it, expect, vi, beforeEach } from "vitest";
import { get } from "svelte/store";
import { useIndicator } from "./useIndicator";
import { buildMockChart } from "../bindings/test-utils";

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    addIndicatorToHost: vi.fn(async () => ({ id: "rsi", seriesIds: ["rsi"] })),
    removeIndicatorFromChart: vi.fn(),
    isStackedChart: vi.fn(() => false),
  };
});

describe("useIndicator svelte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads indicator and cleans up on chart host", async () => {
    const chart = buildMockChart();
    const api = useIndicator(() => chart, "rsi");
    await api.run();
    expect(get(api.result)?.id).toBe("rsi");
    api.cleanup();
    const { removeIndicatorFromChart } = await import("../bindings/shared");
    expect(removeIndicatorFromChart).toHaveBeenCalledWith(chart, "rsi");
  });

  it("records errors", async () => {
    const { addIndicatorToHost } = await import("../bindings/shared");
    vi.mocked(addIndicatorToHost).mockRejectedValueOnce(new Error("fail"));
    const api = useIndicator(() => buildMockChart(), "macd");
    await api.run();
    expect(get(api.error)?.message).toBe("fail");
  });

  it("skips when host is null", async () => {
    const api = useIndicator(() => null, "rsi");
    await api.run();
    expect(get(api.result)).toBeNull();
  });

  it("cleanup no-ops without indicator result", () => {
    const api = useIndicator(() => buildMockChart(), "rsi");
    api.cleanup();
  });

  it("skips cleanup for stacked chart hosts", async () => {
    const { isStackedChart, removeIndicatorFromChart } = await import("../bindings/shared");
    vi.mocked(isStackedChart).mockReturnValueOnce(true);
    const chart = buildMockChart();
    const api = useIndicator(() => chart, "ema");
    await api.run();
    api.cleanup();
    expect(removeIndicatorFromChart).not.toHaveBeenCalled();
  });

  it("wraps non-error rejections", async () => {
    const { addIndicatorToHost } = await import("../bindings/shared");
    vi.mocked(addIndicatorToHost).mockRejectedValueOnce("plain failure");
    const api = useIndicator(() => buildMockChart(), "macd");
    await api.run();
    expect(get(api.error)?.message).toBe("plain failure");
  });
});
