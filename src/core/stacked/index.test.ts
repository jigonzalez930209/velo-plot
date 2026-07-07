import { describe, it, expect } from "vitest";
import { createStackedChart, STACKED_MAX_PANES } from "./index";

describe("stacked barrel exports", () => {
  it("re-exports createStackedChart", () => {
    expect(createStackedChart).toBeTypeOf("function");
    expect(STACKED_MAX_PANES).toBe(5);
  });
});
