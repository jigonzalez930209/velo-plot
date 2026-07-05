import { describe, it, expect } from "vitest";
import { snapLineCoord, snapLabelCoord } from "./pixelSnap";

describe("pixelSnap", () => {
  it("snaps line coords to half-pixel centers", () => {
    expect(snapLineCoord(10)).toBe(10.5);
    expect(snapLineCoord(10.7)).toBe(10.5);
    expect(snapLineCoord(10.2)).toBe(10.5);
  });

  it("snaps label coords to nearest integer", () => {
    expect(snapLabelCoord(10.4)).toBe(10);
    expect(snapLabelCoord(10.6)).toBe(11);
  });
});
