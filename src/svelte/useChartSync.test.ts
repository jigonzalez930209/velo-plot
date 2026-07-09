import { describe, it, expect, vi } from "vitest";
import { get } from "svelte/store";
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

describe("useChartSync svelte", () => {
  it("re-sync destroys previous chart sync handle", () => {
    const charts = [buildMockChart("a"), buildMockChart("b")];
    const api = useChartSync(() => charts, { axis: "x" });
    api.sync();
    api.sync();
    expect(destroy).toHaveBeenCalled();
  });

  it("syncs multiple charts with options", () => {
    const charts = [buildMockChart("a"), buildMockChart("b")];
    const api = useChartSync(() => charts, { axis: "y" });
    api.sync();
    expect(get(api.group)).toBe(mockGroup);
    api.destroy();
    expect(destroy).toHaveBeenCalled();
  });

  it("syncs multiple charts and destroys", () => {
    const charts = [buildMockChart("a"), buildMockChart("b")];
    const api = useChartSync(() => charts);
    api.sync();
    expect(get(api.group)).toBe(mockGroup);
    api.destroy();
    expect(destroy).toHaveBeenCalled();
  });

  it("skips sync for single chart", () => {
    const api = useChartSync(() => [buildMockChart()]);
    api.sync();
    expect(get(api.group)).toBeNull();
  });
});
