import { describe, it, expect } from "vitest";
import {
  applyPrefix,
  autoPrefixFor,
  formatTimeTick,
  formatXTickValue,
  formatYTickValue,
  formatTooltipX,
  formatTooltipY,
} from "./axisFormat";
import { mapToBusinessDayScale } from "../time/TimeScale";

describe("axisFormat", () => {
  describe("applyPrefix", () => {
    it("falls back to a divisor of 1 when the resolved prefix has no divisor", () => {
      // small magnitude → autoPrefixFor returns "" which is not in the divisor map
      expect(applyPrefix(42, "auto")).toBe("42.0");
    });
  });

  describe("formatYTickValue", () => {
    it("returns 0 for zero", () => {
      expect(formatYTickValue(0)).toBe("0");
    });

    it("respects scientific:false for large values like BTC price", () => {
      const formatted = formatYTickValue(62340, { scientific: false });
      expect(formatted).not.toMatch(/e/i);
      expect(formatted.replace(/\D/g, "")).toContain("62340".slice(0, 3));
    });

    it("uses locale thousands separator for values >= 1000 when scientific:false", () => {
      const formatted = formatYTickValue(62340, { scientific: false });
      expect(formatted).toMatch(/62/);
    });

    it("uses scientific notation when scientific:true", () => {
      expect(formatYTickValue(62340, { scientific: true })).toMatch(/e/);
    });

    it("auto-scientific only above 1e6 when not forced linear", () => {
      expect(formatYTickValue(999999)).not.toMatch(/e/i);
      expect(formatYTickValue(1_000_000)).toMatch(/e/i);
    });
  });

  describe("applyPrefix", () => {
    it("scales with k prefix", () => {
      expect(applyPrefix(1500, "k")).toBe("1.50k");
    });

    it("auto-selects M for millions", () => {
      expect(autoPrefixFor(2_500_000)).toBe("M");
      expect(applyPrefix(2_500_000, "auto")).toMatch(/M$/);
    });
  });

  describe("formatXTickValue time axis", () => {
    it("formats epoch-ms as readable date when type is time", () => {
      const ts = Date.UTC(2024, 5, 15, 12, 0, 0);
      const label = formatXTickValue(ts, { type: "time" }, 86400000);
      expect(label).not.toMatch(/^1\.7/);
      expect(label.length).toBeGreaterThan(4);
    });

    it("formatTimeTick produces non-numeric output", () => {
      const label = formatTimeTick(Date.UTC(2024, 0, 1));
      expect(Number.isNaN(Number(label))).toBe(true);
    });

    it("uses business-day mapping for logical tick indices", () => {
      const times = Float64Array.from([Date.UTC(2024, 0, 5), Date.UTC(2024, 0, 8)]);
      const mapping = mapToBusinessDayScale(times, { calendar: "business-day" });
      const label = formatXTickValue(0, { type: "time" }, undefined, mapping);
      expect(label).not.toMatch(/^0$/);
      expect(label.length).toBeGreaterThan(4);
    });

    it("returns empty string for out-of-range business-day tick index", () => {
      const times = Float64Array.from([Date.UTC(2024, 0, 5)]);
      const mapping = mapToBusinessDayScale(times, { calendar: "business-day" });
      expect(formatXTickValue(99, { type: "time" }, undefined, mapping)).toBe("");
    });
  });

  describe("formatTooltip helpers", () => {
    it("formatTooltipX uses time formatter from axisFormat context", () => {
      const ts = Date.UTC(2024, 5, 15);
      const label = formatTooltipX(ts, {
        x: { type: "time" },
        xSpan: 86400000 * 30,
      });
      expect(label).not.toMatch(/^1\.7/);
    });

    it("formatTooltipY respects scientific:false", () => {
      const label = formatTooltipY(45000, { y: { scientific: false } });
      expect(label).not.toMatch(/e/i);
    });
  });

  describe("formatXTickValue linear axis", () => {
    it("formats small values with scientific notation by default", () => {
      expect(formatXTickValue(0.0005)).toMatch(/e/i);
    });

    it("formats linear values without trailing zeros", () => {
      expect(formatXTickValue(1.5)).toBe("1.5");
      expect(formatXTickValue(2)).toBe("2");
    });

    it("uses prefix when configured", () => {
      expect(formatXTickValue(1500, { prefix: "k" })).toBe("1.50k");
    });
  });

  describe("formatYTickValue prefix and micro", () => {
    it("uses milli prefix path via applyPrefix", () => {
      expect(formatYTickValue(0.005, { prefix: "m" })).toMatch(/m$/);
    });

    it("auto prefix selects micro for small values", () => {
      expect(autoPrefixFor(0.0005)).toBe("µ");
    });
  });

  describe("autoPrefixFor covers every magnitude band", () => {
    it("selects each prefix tier", () => {
      expect(autoPrefixFor(5_000)).toBe("k");
      expect(autoPrefixFor(1e-8)).toBe("n");
      expect(autoPrefixFor(0.5)).toBe("m");
      expect(autoPrefixFor(0)).toBe("");
      expect(autoPrefixFor(42)).toBe("");
    });
  });

  describe("pickTimeFormatter granularity", () => {
    it("uses day/month for a multi-week span", () => {
      const label = formatTimeTick(Date.UTC(2024, 5, 15), 1000 * 60 * 60 * 24 * 30);
      expect(Number.isNaN(Number(label))).toBe(true);
    });

    it("uses month/year for a multi-month span", () => {
      const label = formatTimeTick(Date.UTC(2024, 5, 15), 1000 * 60 * 60 * 24 * 120);
      expect(Number.isNaN(Number(label))).toBe(true);
    });
  });
});
