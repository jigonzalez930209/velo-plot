import { describe, it, expect } from "vitest";
import {
  isBusinessDayScaleActive,
  applyBusinessDayX,
  formatBusinessDayTick,
} from "./applyTimeScale";

describe("applyTimeScale", () => {
  it("isBusinessDayScaleActive when time axis uses business-day calendar", () => {
    expect(
      isBusinessDayScaleActive({ type: "time", timeScale: { calendar: "business-day" } }),
    ).toBe(true);
    expect(
      isBusinessDayScaleActive({ type: "time", timeScale: { calendar: "continuous" } }),
    ).toBe(false);
  });

  it("applyBusinessDayX maps timestamps to logical indices", () => {
    const times = Float64Array.from([
      Date.UTC(2024, 0, 5),
      Date.UTC(2024, 0, 6),
      Date.UTC(2024, 0, 8),
    ]);
    const { displayX } = applyBusinessDayX(times, {
      type: "time",
      timeScale: { calendar: "business-day" },
    });
    expect(displayX[0]).toBe(0);
    expect(Number.isNaN(displayX[1])).toBe(true);
    expect(displayX[2]).toBe(1);
  });

  it("formatBusinessDayTick returns date label", () => {
    const times = Float64Array.from([Date.UTC(2024, 0, 5), Date.UTC(2024, 0, 8)]);
    const { mapping } = applyBusinessDayX(times, {
      type: "time",
      timeScale: { calendar: "business-day" },
    });
    const label = formatBusinessDayTick(0, mapping);
    expect(label).toBeTruthy();
    expect(label).not.toMatch(/^0$/);
  });

  it("formatBusinessDayTick returns null for out-of-range index", () => {
    const times = Float64Array.from([Date.UTC(2024, 0, 5)]);
    const { mapping } = applyBusinessDayX(times, {
      type: "time",
      timeScale: { calendar: "business-day" },
    });
    expect(formatBusinessDayTick(99, mapping)).toBeNull();
  });

  it("isBusinessDayScaleActive defaults to business-day when calendar omitted", () => {
    expect(isBusinessDayScaleActive({ type: "time" })).toBe(true);
    expect(isBusinessDayScaleActive({ type: "linear" } as any)).toBe(false);
  });
});
