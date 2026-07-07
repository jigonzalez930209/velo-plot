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
});
