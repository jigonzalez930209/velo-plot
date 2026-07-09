import { describe, it, expect } from "vitest";
import * as solid from "./index";

describe("solid index", () => {
  it("re-exports public solid bindings", () => {
    expect(solid.VeloPlot).toBeTypeOf("function");
    expect(solid.StackedPlot).toBeTypeOf("function");
    expect(solid.useVeloPlot).toBeTypeOf("function");
    expect(solid.useStackedPlot).toBeTypeOf("function");
    expect(solid.useIndicator).toBeTypeOf("function");
    expect(solid.useChartSync).toBeTypeOf("function");
    expect(solid.useChartGroup).toBe(solid.useChartSync);
  });
});
