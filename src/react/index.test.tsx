import { describe, it, expect } from "vitest";
import * as react from "./index";

describe("react index", () => {
  it("re-exports public react bindings", () => {
    expect(react.VeloPlot).toBeDefined();
    expect(react.StackedPlot).toBeDefined();
    expect(react.useVeloPlot).toBeTypeOf("function");
    expect(react.useStackedPlot).toBeTypeOf("function");
    expect(react.useIndicator).toBeTypeOf("function");
    expect(react.useChartSync).toBeTypeOf("function");
    expect(react.useChartGroup).toBe(react.useChartSync);
  });
});
