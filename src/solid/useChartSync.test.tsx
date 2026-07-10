import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { useChartSync } from "./useChartSync";
import { buildMockChart } from "../bindings/test-utils";

const destroy = vi.fn();
const mockGroup = { destroy };

vi.mock("../bindings/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../bindings/shared")>();
  return {
    ...actual,
    createChartSync: vi.fn(() => ({ group: mockGroup, destroy })),
  };
});

describe("useChartSync solid", () => {
  it("creates sync group for multiple charts", async () => {
    let readGroup: (() => unknown) | undefined;
    const dispose = createRoot((disposeFn) => {
      readGroup = useChartSync(() => [buildMockChart("a"), buildMockChart("b")]).group;
      return disposeFn;
    });
    await Promise.resolve();
    expect(readGroup?.()).toBe(mockGroup);
    dispose();
    expect(destroy).toHaveBeenCalled();
  });

  it("returns null for single chart", () => {
    let groupValue: unknown = "unset";
    const dispose = createRoot((disposeFn) => {
      groupValue = useChartSync(() => [buildMockChart()]).group();
      return disposeFn;
    });
    expect(groupValue).toBeNull();
    dispose();
  });
});
