import { describe, it, expect } from "vitest";
import { LinearScale, LogScale, createScale } from "./index";

describe("LinearScale", () => {
  it("transforms and inverts linearly", () => {
    const scale = new LinearScale();
    scale.setDomain(0, 100);
    scale.setRange(0, 500);
    expect(scale.transform(50)).toBe(250);
    expect(scale.invert(250)).toBeCloseTo(50);
  });

  it("handles degenerate domain by expanding", () => {
    const scale = new LinearScale();
    scale.setDomain(5, 5);
    expect(scale.domain[0]).toBeLessThan(5);
    expect(scale.domain[1]).toBeGreaterThan(5);
  });

  it("handles non-finite domain", () => {
    const scale = new LinearScale();
    scale.setDomain(NaN, Infinity);
    expect(scale.domain).toEqual([0, 1]);
  });

  it("generates ticks across domain", () => {
    const scale = new LinearScale();
    scale.setDomain(0, 100);
    const ticks = scale.ticks(5);
    expect(ticks.length).toBeGreaterThan(1);
    expect(ticks[0]).toBeGreaterThanOrEqual(0);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(100);
  });

  it("returns empty ticks when domain min equals max before expansion", () => {
    const scale = new LinearScale();
    scale.domain = [5, 5];
    expect(scale.ticks()).toEqual([]);
  });
});

describe("LogScale", () => {
  it("transforms positive values on log scale", () => {
    const scale = new LogScale();
    scale.setDomain(1, 1000);
    scale.setRange(0, 100);
    expect(scale.transform(10)).toBeGreaterThan(0);
    expect(scale.transform(10)).toBeLessThan(100);
  });

  it("maps non-positive values to range start", () => {
    const scale = new LogScale();
    scale.setDomain(1, 100);
    scale.setRange(10, 90);
    expect(scale.transform(0)).toBe(10);
    expect(scale.transform(-5)).toBe(10);
  });

  it("inverts pixel back to data value", () => {
    const scale = new LogScale();
    scale.setDomain(1, 1000);
    scale.setRange(0, 100);
    const mid = scale.transform(10);
    expect(scale.invert(mid)).toBeCloseTo(10, 0);
  });

  it("generates power-of-ten ticks", () => {
    const scale = new LogScale();
    scale.setDomain(1, 1000);
    const ticks = scale.ticks(10);
    expect(ticks).toContain(1);
    expect(ticks).toContain(10);
    expect(ticks).toContain(100);
  });

  it("expands equal domain", () => {
    const scale = new LogScale();
    scale.setDomain(50, 50);
    expect(scale.domain[0]).toBeLessThan(scale.domain[1]);
  });
});

describe("createScale", () => {
  it("creates linear or log scale", () => {
    expect(createScale("linear").type).toBe("linear");
    expect(createScale("log").type).toBe("log");
  });
});
