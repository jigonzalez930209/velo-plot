import { describe, it, expect } from "vitest";
import { computeMeasurement, formatMeasurement, formatPrice } from "./measure";

describe("computeMeasurement", () => {
  it("computes an upward range", () => {
    const m = computeMeasurement({ x: 0, y: 100 }, { x: 5, y: 110 });
    expect(m.change).toBe(10);
    expect(m.percent).toBeCloseTo(10);
    expect(m.bars).toBe(5);
    expect(m.up).toBe(true);
  });

  it("computes a downward range", () => {
    const m = computeMeasurement({ x: 2, y: 100 }, { x: 0, y: 75 });
    expect(m.change).toBe(-25);
    expect(m.percent).toBeCloseTo(-25);
    expect(m.bars).toBe(2);
    expect(m.up).toBe(false);
  });

  it("guards against a zero start price", () => {
    const m = computeMeasurement({ x: 0, y: 0 }, { x: 1, y: 5 });
    expect(m.percent).toBe(0);
    expect(m.change).toBe(5);
  });
});

describe("formatMeasurement", () => {
  it("formats an upward measurement with plus signs", () => {
    const label = formatMeasurement(computeMeasurement({ x: 0, y: 100 }, { x: 3, y: 110 }));
    expect(label).toBe("+10.00 (+10.00%) · 3 bars");
  });

  it("formats a downward measurement with a minus sign", () => {
    const label = formatMeasurement(computeMeasurement({ x: 0, y: 100 }, { x: 4, y: 90 }));
    expect(label).toBe("-10.00 (-10.00%) · 4 bars");
  });
});

describe("formatPrice", () => {
  it("uses no decimals for large values", () => {
    expect(formatPrice(12345.67)).toBe("12,346");
  });

  it("uses two decimals for mid-range values", () => {
    expect(formatPrice(123.4)).toBe("123.40");
  });

  it("uses four decimals for sub-unit values", () => {
    expect(formatPrice(0.12345)).toBe("0.1235");
  });
});
