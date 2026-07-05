import { describe, it, expect } from "vitest";
import { usesVolumeBarPinning } from "./NavigationUtils";

function mockSeries(types: string[], visible = true) {
  return types.map((type) => ({
    isVisible: () => visible,
    getType: () => type,
  }));
}

describe("usesVolumeBarPinning", () => {
  it("pins Y for pure bar charts (volume)", () => {
    expect(usesVolumeBarPinning(mockSeries(["bar"]))).toBe(true);
  });

  it("does not pin when bars are mixed with lines (indicators)", () => {
    expect(usesVolumeBarPinning(mockSeries(["bar", "bar", "line", "band"]))).toBe(
      false,
    );
  });

  it("does not pin line-only charts", () => {
    expect(usesVolumeBarPinning(mockSeries(["line"]))).toBe(false);
  });
});
