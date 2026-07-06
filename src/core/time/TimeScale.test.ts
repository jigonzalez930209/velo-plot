import { describe, it, expect } from "vitest";
import {
  isBusinessDay,
  mapToBusinessDayScale,
  businessDaySpanMs,
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
});
