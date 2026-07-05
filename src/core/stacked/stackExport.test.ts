import { describe, it, expect } from "vitest";
import { stackResolutionScale } from "./stackExport";

describe("stackResolutionScale", () => {
  it("maps named presets to scale factors", () => {
    expect(stackResolutionScale("standard")).toBe(1);
    expect(stackResolutionScale("2k")).toBe(2);
    expect(stackResolutionScale("4k")).toBe(4);
    expect(stackResolutionScale("8k")).toBe(8);
    expect(stackResolutionScale(3)).toBe(3);
  });
});
