import { describe, expect, it } from "vitest";
import {
  normalizePaneHeights,
  resolveMinPaneHeightPx,
  resolveMinPaneWidthPx,
  initialPaneRatio,
  applyPaneFlexRatios,
  paneFlexStyle,
  injectDividerStyles,
  measurePaneSizes,
  resolveDragStartSizes,
} from "./paneResize";
import { STACKED_DEFAULT_MIN_PANE_RATIO } from "./types";

describe("paneResize helpers", () => {
  it("injectDividerStyles is a no-op when document is unavailable", () => {
    expect(typeof document).toBe("undefined");
    expect(() => injectDividerStyles("vertical")).not.toThrow();
    expect(() => injectDividerStyles("horizontal")).not.toThrow();
  });

  it("resolveDragStartSizes measures panes when no callback is provided", () => {
    const wrappers = [
      { getBoundingClientRect: () => ({ width: 120, height: 200 }) },
      { getBoundingClientRect: () => ({ width: 280, height: 200 }) },
    ] as HTMLDivElement[];

    expect(resolveDragStartSizes(undefined, 0, 1, wrappers, true)).toEqual([120, 280]);
    expect(resolveDragStartSizes(undefined, 0, 1, wrappers, false)).toEqual([200, 200]);
    expect(measurePaneSizes(wrappers, true)).toEqual([120, 280]);
  });

  it("resolveMinPaneHeightPx returns 1 for invalid inputs", () => {
    expect(resolveMinPaneHeightPx(0, 4)).toBe(1);
    expect(resolveMinPaneHeightPx(600, 0)).toBe(1);
  });

  it("normalizePaneHeights returns empty input unchanged", () => {
    expect(normalizePaneHeights([], 300)).toEqual([]);
  });

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

  it("normalizePaneHeights distributes evenly when input sum is zero", () => {
    const out = normalizePaneHeights([0, 0, 0], 300);
    expect(out.reduce((s, h) => s + h, 0)).toBe(300);
    expect(out.every((h) => h >= 1)).toBe(true);
  });

  it("resolveMinPaneWidthPx mirrors height logic on width", () => {
    expect(resolveMinPaneWidthPx(800, 4)).toBeCloseTo(800 / 6);
  });

  it("initialPaneRatio returns numeric ratio or 1 for strings", () => {
    expect(initialPaneRatio(0.4)).toBe(0.4);
    expect(initialPaneRatio("30%")).toBe(1);
  });

  it("paneFlexStyle uses width min for horizontal layout", () => {
    expect(paneFlexStyle(0.5, "horizontal")).toContain("min-width:0");
    expect(paneFlexStyle("40%", "vertical")).toContain("flex:1 1 40%");
  });

  it("applyPaneFlexRatios sets flex styles on wrappers", () => {
    const wrappers = [{ style: { cssText: "" } }, { style: { cssText: "" } }] as HTMLDivElement[];
    applyPaneFlexRatios(wrappers, [0.6, 0.4], "vertical");
    expect(wrappers[0].style.cssText).toContain("flex:0.6");
    expect(wrappers[1].style.cssText).toContain("flex:0.4");
  });
});
