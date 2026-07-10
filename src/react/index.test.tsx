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

  it("keeps SciPlot / SciChart aliases for backward compatibility", () => {
    expect(react.SciPlot).toBe(react.VeloPlot);
    expect(react.SciChart).toBe(react.VeloPlot);
    expect(react.useSciPlot).toBe(react.useVeloPlot);
    expect(react.useSciChart).toBe(react.useVeloPlot);
  });
});
