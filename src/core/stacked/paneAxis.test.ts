import { describe, it, expect } from "vitest";
import { tickCountForPaneHeight, tickCountForPaneWidth } from "./paneAxis";

describe("paneAxis", () => {
  it("reduces Y ticks for short panes", () => {
    expect(tickCountForPaneHeight(40, 6)).toBe(2);
    expect(tickCountForPaneHeight(120, 6)).toBe(3);
    expect(tickCountForPaneHeight(300, 6)).toBe(6);
  });

  it("reduces X ticks for narrow panes", () => {
    expect(tickCountForPaneWidth(150, 8)).toBe(2);
    expect(tickCountForPaneWidth(600, 8)).toBe(8);
  });
});
