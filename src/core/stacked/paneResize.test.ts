import { describe, expect, it } from "vitest";
import {
  normalizePaneHeights,
  resolveMinPaneHeightPx,
} from "./paneResize";
import { STACKED_DEFAULT_MIN_PANE_RATIO } from "./types";

describe("paneResize helpers", () => {
  it("resolveMinPaneHeightPx defaults to 1/6 of available height", () => {
    expect(resolveMinPaneHeightPx(600, 4)).toBe(100);
    expect(resolveMinPaneHeightPx(600, 4, STACKED_DEFAULT_MIN_PANE_RATIO)).toBe(
      100,
    );
  });

  it("resolveMinPaneHeightPx never exceeds equal split", () => {
    expect(resolveMinPaneHeightPx(400, 8, 1 / 6)).toBe(50);
  });

  it("normalizePaneHeights fills exact target total", () => {
    const out = normalizePaneHeights([255.4, 48.2, 130.1, 108.3], 542);
    expect(out.reduce((s, h) => s + h, 0)).toBe(542);
    expect(out.every((h) => h >= 1)).toBe(true);
  });

  it("normalizePaneHeights preserves proportions approximately", () => {
    const out = normalizePaneHeights([200, 100], 300);
    expect(out).toEqual([200, 100]);
  });
});
