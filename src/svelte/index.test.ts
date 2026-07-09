import { describe, it, expect } from "vitest";
import * as svelte from "./index";

describe("svelte index", () => {
  it("re-exports public svelte bindings", () => {
    expect(svelte.createVeloPlot).toBeTypeOf("function");
    expect(svelte.useVeloPlot).toBe(svelte.createVeloPlot);
    expect(svelte.createStackedPlot).toBeTypeOf("function");
    expect(svelte.useStackedPlot).toBe(svelte.createStackedPlot);
    expect(svelte.useIndicator).toBeTypeOf("function");
    expect(svelte.useChartSync).toBeTypeOf("function");
    expect(svelte.useChartGroup).toBe(svelte.useChartSync);
  });
});
