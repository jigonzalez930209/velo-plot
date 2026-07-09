import { describe, it, expect } from "vitest";
import * as shared from "./index";

describe("bindings shared index", () => {
  it("re-exports binding modules", () => {
    expect(shared.createChartLifecycle).toBeTypeOf("function");
    expect(shared.diffSeries).toBeTypeOf("function");
    expect(shared.syncChartOptions).toBeTypeOf("function");
    expect(shared.syncStackedPaneSeries).toBeTypeOf("function");
    expect(shared.addIndicatorToHost).toBeTypeOf("function");
    expect(shared.createChartSync).toBeTypeOf("function");
    expect(shared.applyChartA11y).toBeTypeOf("function");
  });
});
