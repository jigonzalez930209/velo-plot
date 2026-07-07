import { describe, it, expect, vi } from "vitest";
import { PluginDrawingTools, type DrawingToolsAPI } from "./index";
import type { PluginContext } from "../types";

function createContext() {
  const annotations: { id: string; type: string; [key: string]: unknown }[] = [];
  let clickHandler: ((evt: { point: { x: number; y: number } }) => void) | null = null;

  const chart = {
    on: vi.fn((event: string, handler: typeof clickHandler) => {
      if (event === "click") clickHandler = handler;
    }),
    off: vi.fn(),
    addAnnotation: vi.fn((a: { id?: string; type: string; [key: string]: unknown }) => {
      annotations.push({ ...a, id: a.id ?? `ann-${annotations.length}` });
    }),
    removeAnnotation: vi.fn((id: string) => {
      const i = annotations.findIndex((a) => a.id === id);
      if (i >= 0) annotations.splice(i, 1);
    }),
    getAnnotations: vi.fn(() => [...annotations]),
  };

  const ctx = { chart } as unknown as PluginContext;
  return { ctx, chart, getClickHandler: () => clickHandler, annotations };
}

describe("PluginDrawingTools", () => {
  it("adds horizontal line on click", () => {
    const plugin = PluginDrawingTools({ color: "#fff" });
    const { ctx, getClickHandler, annotations } = createContext();
    plugin.onInit!(ctx);

    const api = plugin.api as DrawingToolsAPI;
    api.setMode("horizontal");
    getClickHandler()?.({ point: { x: 10, y: 42 } });

    expect(annotations).toHaveLength(1);
    expect(annotations[0].type).toBe("horizontal-line");
    expect(annotations[0].y).toBe(42);
  });

  it("adds trendline after two clicks", () => {
    const plugin = PluginDrawingTools();
    const { ctx, getClickHandler, annotations } = createContext();
    plugin.onInit!(ctx);

    const api = plugin.api as DrawingToolsAPI;
    api.setMode("trendline");
    getClickHandler()?.({ point: { x: 1, y: 2 } });
    getClickHandler()?.({ point: { x: 5, y: 8 } });

    expect(annotations).toHaveLength(1);
    expect(annotations[0].type).toBe("arrow");
  });

  it("undo restores previous annotation snapshot", () => {
    const plugin = PluginDrawingTools();
    const { ctx, getClickHandler } = createContext();
    plugin.onInit!(ctx);

    const api = plugin.api as DrawingToolsAPI;
    api.setMode("vertical");
    getClickHandler()?.({ point: { x: 99, y: 1 } });
    expect(api.undo()).toBe(true);
    expect(ctx.chart.getAnnotations()).toHaveLength(0);
  });

  it("ignores clicks in pan mode", () => {
    const plugin = PluginDrawingTools();
    const { ctx, getClickHandler, annotations } = createContext();
    plugin.onInit!(ctx);

    (plugin.api as DrawingToolsAPI).setMode("pan");
    getClickHandler()?.({ point: { x: 1, y: 1 } });
    expect(annotations).toHaveLength(0);
  });

  it("unsubscribes click handler on destroy", () => {
    const plugin = PluginDrawingTools();
    const { ctx, chart } = createContext();
    plugin.onInit!(ctx);
    plugin.onDestroy!(ctx);
    expect(chart.off).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("adds rectangle after two clicks", () => {
    const plugin = PluginDrawingTools();
    const { ctx, getClickHandler, annotations } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("rectangle");
    getClickHandler()?.({ point: { x: 1, y: 2 } });
    getClickHandler()?.({ point: { x: 9, y: 8 } });
    expect(annotations[0].type).toBe("rectangle");
  });

  it("adds fibonacci retracement levels", () => {
    const plugin = PluginDrawingTools();
    const { ctx, getClickHandler, annotations } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("fibonacci");
    getClickHandler()?.({ point: { x: 1, y: 20 } });
    getClickHandler()?.({ point: { x: 5, y: 80 } });
    expect(annotations.length).toBeGreaterThanOrEqual(5);
    expect(annotations.every((a) => a.type === "horizontal-line")).toBe(true);
  });

  it("redo restores undone annotation", () => {
    const plugin = PluginDrawingTools();
    const { ctx, getClickHandler } = createContext();
    plugin.onInit!(ctx);
    const api = plugin.api as DrawingToolsAPI;
    api.setMode("vertical");
    getClickHandler()?.({ point: { x: 5, y: 1 } });
    expect(ctx.chart.getAnnotations()).toHaveLength(1);
    api.undo();
    expect(ctx.chart.getAnnotations()).toHaveLength(0);
    api.redo();
    expect(ctx.chart.getAnnotations()).toHaveLength(1);
  });

  it("clear removes all annotations", () => {
    const plugin = PluginDrawingTools();
    const { ctx, getClickHandler } = createContext();
    plugin.onInit!(ctx);
    const api = plugin.api as DrawingToolsAPI;
    api.setMode("horizontal");
    getClickHandler()?.({ point: { x: 1, y: 10 } });
    api.clear();
    expect(ctx.chart.getAnnotations()).toHaveLength(0);
  });
});
