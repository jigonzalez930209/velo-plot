import { describe, it, expect } from "vitest";
import { buildPositionLineAnnotation } from "./positionLines";

describe("positionLines", () => {
  it("builds entry line annotation", () => {
    const a = buildPositionLineAnnotation({ price: 100, style: "entry" }, "e1");
    expect(a.type).toBe("horizontal-line");
    expect(a.y).toBe(100);
    expect(a.label).toBe("Entry");
  });

  it("builds stop-loss with dashed line", () => {
    const a = buildPositionLineAnnotation({ price: 95, style: "sl" }, "sl1");
    expect(a.lineDash).toEqual([6, 4]);
    expect(a.color).toBe("#ef4444");
  });

  it("builds take-profit with dashed line and custom label", () => {
    const a = buildPositionLineAnnotation(
      { price: 110, style: "tp", label: "Target", color: "#fff" },
      "tp1",
    );
    expect(a.lineDash).toEqual([4, 4]);
    expect(a.label).toBe("Target");
    expect(a.color).toBe("#fff");
  });

  it("defaults to the entry style when style is omitted", () => {
    const a = buildPositionLineAnnotation({ price: 100 }, "d1");
    expect(a.label).toBe("Entry");
    expect(a.color).toBe("#38bdf8");
    expect(a.lineDash).toBeUndefined();
    expect(a.interactive).toBe(false);
  });
});
