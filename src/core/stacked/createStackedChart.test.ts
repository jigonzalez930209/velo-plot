import { describe, it, expect } from "vitest";
import { createStackedChart } from "./createStackedChart";
import { STACKED_MAX_PANES } from "./types";

describe("createStackedChart", () => {
  it("STACKED_MAX_PANES is 5", () => {
    expect(STACKED_MAX_PANES).toBe(5);
  });

  it("rejects empty pane list", () => {
    const container = { replaceChildren: () => {} } as unknown as HTMLDivElement;
    expect(() =>
      createStackedChart({ container, panes: [] }),
    ).toThrow(/1–5/);
  });

  it("rejects more than 5 panes", () => {
    const container = { replaceChildren: () => {} } as unknown as HTMLDivElement;
    const panes = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i}`,
      height: 1,
    }));
    expect(() => createStackedChart({ container, panes })).toThrow(/1–5/);
  });
});
