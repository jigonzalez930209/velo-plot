import { describe, it, expect } from "vitest";

describe("stacked barrel exports", () => {
  it("re-exports createStackedChart", async () => {
    const mod = await import("./index");
    expect(mod.createStackedChart).toBeTypeOf("function");
    expect(mod.STACKED_MAX_PANES).toBe(5);
  });
});
