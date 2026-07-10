import { describe, it, expect, vi } from "vitest";
import {
  buildAriaLabel,
  applyChartA11y,
  updateA11y,
} from "./a11y";

const keyboardInstances: Array<{ callbacks: Record<string, () => void>; destroy: ReturnType<typeof vi.fn> }> = [];

vi.mock("../../core/keybindings", () => ({
  KeyBindingManager: vi.fn((opts: { callbacks: Record<string, () => void> }) => {
    const inst = { callbacks: opts.callbacks, destroy: vi.fn() };
    keyboardInstances.push(inst);
    return inst;
  }),
}));

describe("a11y", () => {
  it("applyChartA11y sets role and label", () => {
    const el = document.createElement("div");
    const handle = applyChartA11y(
      el,
      { resetZoom: () => {} },
      {
        series: [{ id: "a", x: new Float32Array([0, 1]), y: new Float32Array([0, 1]) }],
        bounds: { xMin: 0, xMax: 10, yMin: -1, yMax: 1 },
      },
    );
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("tabindex")).toBe("0");
    expect(el.getAttribute("aria-label")).toContain("Visible range");
    expect(el.querySelector("table")).toBeTruthy();
    handle.cleanup();
    expect(el.querySelector("table")).toBeNull();
  });

  it("buildAriaLabel uses custom label and handles empty series", () => {
    expect(buildAriaLabel([], null, "Custom")).toBe("Custom");
    expect(buildAriaLabel([], null)).toBe("Chart");
    expect(buildAriaLabel([{ id: "s1", x: new Float32Array(), y: new Float32Array() }])).toContain(
      "s1",
    );
  });

  it("updateA11y refreshes label and sr table", () => {
    const el = document.createElement("div");
    const table = document.createElement("table");
    updateA11y(el, table, {
      series: [
        {
          id: "heat",
          type: "heatmap",
          data: { xValues: [0], yValues: [0], zValues: new Float32Array([1, 2, 3]) },
        },
      ],
      bounds: { xMin: 0, xMax: 1, yMin: -1, yMax: 1 },
      label: "Updated",
    });
    expect(el.getAttribute("aria-label")).toBe("Updated");
    expect(table.querySelector("tbody")?.textContent).toContain("3");
  });

  it("sr table handles missing bounds and non-x series", () => {
    const el = document.createElement("div");
    const handle = applyChartA11y(el, { resetZoom: () => {} }, {
      series: [{ id: "plain", x: new Float32Array(), y: new Float32Array() }],
      enableKeyboard: false,
    });
    updateA11y(el, handle.srTable, {
      series: [{ id: "no-data", type: "heatmap", data: { xValues: [], yValues: [], zValues: new Float32Array() } }],
      bounds: null,
    });
    expect(handle.srTable?.textContent).toContain("—");
    handle.cleanup();
  });

  it("updateA11y without sr table only updates label", () => {
    const el = document.createElement("div");
    updateA11y(el, undefined, { label: "Only label", series: [] });
    expect(el.getAttribute("aria-label")).toBe("Only label");
  });

  it("updateA11y with sr table and omitted series uses empty rows", () => {
    const el = document.createElement("div");
    const table = document.createElement("table");
    updateA11y(el, table, { label: "No series", bounds: null });
    expect(table.querySelector("tbody")).toBeTruthy();
    expect(el.getAttribute("aria-label")).toBe("No series");
  });

  it("sr table counts zero points for series without x", () => {
    const el = document.createElement("div");
    const handle = applyChartA11y(el, { resetZoom: () => {} }, {
      series: [{ id: "empty" } as import("./types").VeloPlotSeries],
      enableKeyboard: false,
    });
    expect(handle.srTable?.textContent).toContain("0");
    handle.cleanup();
  });

  it("applyChartA11y keyboard callbacks and disable keyboard", () => {
    keyboardInstances.length = 0;
    const resetZoom = vi.fn();
    const pan = vi.fn();
    const zoom = vi.fn();
    const chart = {
      resetZoom,
      pan,
      zoom,
      getViewBounds: () => ({ xMin: 0, xMax: 10, yMin: 0, yMax: 10 }),
    };
    const el = document.createElement("div");
    const handle = applyChartA11y(el, chart, { enableKeyboard: true });
    const kb = keyboardInstances[0]!;
    kb.callbacks.onResetZoom();
    kb.callbacks.onPanLeft();
    kb.callbacks.onPanRight();
    kb.callbacks.onPanUp();
    kb.callbacks.onPanDown();
    kb.callbacks.onZoomIn();
    kb.callbacks.onZoomOut();
    kb.callbacks.onEscape();
    expect(resetZoom).toHaveBeenCalled();
    expect(pan).toHaveBeenCalled();
    expect(zoom).toHaveBeenCalled();
    handle.cleanup();
    expect(kb.destroy).toHaveBeenCalled();

    const chartWithoutPan = { zoom, getViewBounds: () => ({ xMin: 0, xMax: 10, yMin: 0, yMax: 10 }) };
    const noKb = applyChartA11y(el, chartWithoutPan, { enableKeyboard: false });
    expect(noKb.keyboard).toBeUndefined();
    noKb.cleanup();
  });

  it("zoom callbacks no-op without view bounds", () => {
    keyboardInstances.length = 0;
    const zoom = vi.fn();
    const el = document.createElement("div");
    const handle = applyChartA11y(el, { zoom }, { enableKeyboard: true });
    const kb = keyboardInstances[0]!;
    kb.callbacks.onZoomIn();
    kb.callbacks.onZoomOut();
    expect(zoom).not.toHaveBeenCalled();
    handle.cleanup();
  });

  it("updateA11y updates sr table when provided", () => {
    const el = document.createElement("div");
    const table = document.createElement("table");
    updateA11y(el, table, {
      series: [{ id: "s1", x: new Float32Array([0, 1]), y: new Float32Array([0, 1]) }],
      bounds: { xMin: 0, xMax: 1, yMin: -1, yMax: 1 },
    });
    expect(table.querySelector("tbody")).toBeTruthy();
  });

  it("sr table treats empty x arrays as zero points", () => {
    const el = document.createElement("div");
    const handle = applyChartA11y(el, { resetZoom: () => {} }, {
      series: [{ id: "empty", x: new Float32Array(), y: new Float32Array() }],
      enableKeyboard: false,
    });
    updateA11y(el, handle.srTable, {
      series: [{ id: "empty", x: new Float32Array(), y: new Float32Array() }],
    });
    expect(handle.srTable?.textContent).toContain("0");
    handle.cleanup();
  });

  it("sr table uses zero points when x is missing", () => {
    const el = document.createElement("div");
    const handle = applyChartA11y(el, { resetZoom: () => {} }, {
      series: [{ id: "empty", x: undefined, y: undefined } as import("./types").VeloPlotSeries],
      enableKeyboard: false,
    });
    expect(handle.srTable?.textContent).toContain("0");
    handle.cleanup();
  });
});
