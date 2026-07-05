import { describe, it, expect } from "vitest";
import { STACKED_MAX_PANES } from "./types";

describe("createStackedChart", () => {
  it("STACKED_MAX_PANES is 5", () => {
    expect(STACKED_MAX_PANES).toBe(5);
  });

  it("rejects empty pane list", async () => {
    const { createStackedChart } = await import("./createStackedChart");
    const container = { replaceChildren: () => {} } as unknown as HTMLDivElement;
    expect(() =>
      createStackedChart({ container, panes: [] }),
    ).toThrow(/1–5/);
  });

  it("rejects more than 5 panes", async () => {
    const { createStackedChart } = await import("./createStackedChart");
    const container = { replaceChildren: () => {} } as unknown as HTMLDivElement;
    const panes = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i}`,
      height: 1,
    }));
    expect(() => createStackedChart({ container, panes })).toThrow(/1–5/);
  });
});
