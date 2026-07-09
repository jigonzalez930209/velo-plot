import { describe, it, expect } from "vitest";
import { formatBindingDimension } from "./dimensions";

describe("formatBindingDimension", () => {
  it("formats numeric and string values", () => {
    expect(formatBindingDimension(500)).toBe("500px");
    expect(formatBindingDimension("75%")).toBe("75%");
    expect(formatBindingDimension("auto")).toBe("auto");
  });
});
