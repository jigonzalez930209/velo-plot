import "@angular/compiler";
import { describe, it, expect } from "vitest";
import * as angular from "./index";

describe("angular index", () => {
  it("re-exports public angular bindings", () => {
    expect(angular.VeloPlotComponent).toBeDefined();
    expect(angular.StackedPlotComponent).toBeDefined();
    expect(angular.VeloPlotHost).toBeDefined();
    expect(angular.useVeloPlotAngular).toBeTypeOf("function");
    expect(angular.useStackedPlotAngular).toBeTypeOf("function");
    expect(angular.useIndicatorAngular).toBeTypeOf("function");
    expect(angular.useChartSyncAngular).toBeTypeOf("function");
  });
});
