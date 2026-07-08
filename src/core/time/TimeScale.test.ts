import { describe, it, expect } from "vitest";
import {
  isBusinessDay,
  mapToBusinessDayScale,
  businessDaySpanMs,
  timeAtBusinessIndex,
} from "./TimeScale";

describe("TimeScale", () => {
  it("isBusinessDay rejects UTC weekends", () => {
    // 2024-01-06 Saturday UTC
    expect(isBusinessDay(Date.UTC(2024, 0, 6))).toBe(false);
    // 2024-01-08 Monday UTC
    expect(isBusinessDay(Date.UTC(2024, 0, 8))).toBe(true);
  });

  it("mapToBusinessDayScale assigns consecutive indices skipping weekends", () => {
    const fri = Date.UTC(2024, 0, 5);
    const sat = Date.UTC(2024, 0, 6);
    const mon = Date.UTC(2024, 0, 8);
    const times = Float64Array.from([fri, sat, mon]);
    const mapped = mapToBusinessDayScale(times, { calendar: "business-day" });
    expect(mapped.scaledX[0]).toBe(0);
    expect(Number.isNaN(mapped.scaledX[1])).toBe(true);
    expect(mapped.scaledX[2]).toBe(1);
    expect(mapped.timeByIndex.length).toBe(2);
  });

  it("continuous calendar passes timestamps through", () => {
    const times = Float32Array.from([1, 2, 3]);
    const mapped = mapToBusinessDayScale(times, { calendar: "continuous" });
    expect(mapped.scaledX[1]).toBe(2);
  });

  it("businessDaySpanMs uses mapped timestamps", () => {
    const times = Float32Array.from([0, 86_400_000]);
    const mapped = mapToBusinessDayScale(times, { calendar: "continuous" });
    expect(businessDaySpanMs(mapped, 0, 1)).toBe(86_400_000);
  });

  it("maps non-finite timestamps to NaN on business-day calendar", () => {
    const times = Float64Array.from([Date.UTC(2024, 0, 8), NaN, Date.UTC(2024, 0, 9)]);
    const mapped = mapToBusinessDayScale(times, { calendar: "business-day" });
    expect(Number.isNaN(mapped.scaledX[1])).toBe(true);
    expect(mapped.timeByIndex.length).toBe(2);
  });

  it("businessDaySpanMs falls back when indices are out of range", () => {
    const times = Float64Array.from([Date.UTC(2024, 0, 8)]);
    const mapped = mapToBusinessDayScale(times, { calendar: "business-day" });
    expect(businessDaySpanMs(mapped, 99, 100)).toBe(86_400_000);
  });

  it("timeAtBusinessIndex returns undefined for missing index", () => {
    const times = Float64Array.from([Date.UTC(2024, 0, 8)]);
    const mapped = mapToBusinessDayScale(times, { calendar: "business-day" });
    expect(timeAtBusinessIndex(mapped, 5)).toBeUndefined();
  });

  it("defaults to the business-day calendar when no options are given", () => {
    const times = Float64Array.from([
      Date.UTC(2024, 0, 5), // Fri
      Date.UTC(2024, 0, 6), // Sat (skipped)
      Date.UTC(2024, 0, 8), // Mon
    ]);
    const mapped = mapToBusinessDayScale(times);
    expect(Number.isNaN(mapped.scaledX[1])).toBe(true);
    expect(mapped.timeByIndex.length).toBe(2);
  });

  it("continuous calendar reuses a Float64Array input as timeByIndex", () => {
    const times = Float64Array.from([10, 20, 30]);
    const mapped = mapToBusinessDayScale(times, { calendar: "continuous" });
    // same Float64Array instance is passed through without a copy
    expect(mapped.timeByIndex).toBe(times);
  });

  it("businessDaySpanMs falls back to one day for a zero-width span", () => {
    const times = Float64Array.from([1_000, 1_000]);
    const mapped = mapToBusinessDayScale(times, { calendar: "continuous" });
    // xMin===xMax collapses to a single index → t0===t1 → MS_DAY fallback
    expect(businessDaySpanMs(mapped, 0, 0)).toBe(86_400_000);
  });
});
