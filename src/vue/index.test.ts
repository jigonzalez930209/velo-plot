import { describe, it, expect } from "vitest";
import * as vue from "./index";

describe("vue index", () => {
  it("re-exports public vue bindings", () => {
    expect(vue.VeloPlot).toBeDefined();
    expect(vue.StackedPlot).toBeDefined();
    expect(vue.useVeloPlot).toBeTypeOf("function");
    expect(vue.useStackedPlot).toBeTypeOf("function");
    expect(vue.useIndicator).toBeTypeOf("function");
    expect(vue.useChartSync).toBeTypeOf("function");
    expect(vue.useChartGroup).toBe(vue.useChartSync);
  });
});
