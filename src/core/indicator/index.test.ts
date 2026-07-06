import { describe, it, expect } from "vitest";

describe("indicator barrel exports", () => {
  it("re-exports addIndicator helpers", async () => {
    const mod = await import("./index");
    expect(mod.addIndicatorToChart).toBeTypeOf("function");
    expect(mod.buildIndicatorPaneFromPreset).toBeTypeOf("function");
    expect(mod.computeIndicatorPreset).toBeTypeOf("function");
  });
});
