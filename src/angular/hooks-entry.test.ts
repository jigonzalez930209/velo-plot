import { describe, it, expect } from "vitest";
import * as entry from "./hooks-entry";

describe("angular hooks-entry", () => {
  it("re-exports angular hooks", () => {
    expect(entry.VeloPlotHost).toBeDefined();
    expect(entry.useVeloPlotAngular).toBeTypeOf("function");
    expect(entry.useStackedPlotAngular).toBeTypeOf("function");
    expect(entry.useIndicatorAngular).toBeTypeOf("function");
    expect(entry.useChartSyncAngular).toBeTypeOf("function");
  });
});
