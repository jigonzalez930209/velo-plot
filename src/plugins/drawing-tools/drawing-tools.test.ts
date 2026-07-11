import { describe, it, expect, vi } from "vitest";
import { LinearScale } from "../../scales";
import { PluginDrawingTools, type DrawingToolsAPI } from "./index";
import type { InteractionEvent, PluginContext } from "../types";
import type { SVGExportPluginContext } from "../../core/chart/exporter/svg/plugins/types";

function createInteractionEvent(
  type: InteractionEvent["type"],
  pixelX: number,
  pixelY: number,
  inPlotArea = true,
): InteractionEvent {
  let prevented = false;
  return {
    type,
    pixelX,
    pixelY,
    inPlotArea,
    originalEvent: {} as MouseEvent,
    preventDefault: () => {
      prevented = true;
    },
    get defaultPrevented() {
      return prevented;
    },
  };
}

function createContext() {
  const annotations: { id: string; type: string; [key: string]: unknown }[] = [];

  const chart = {
    addAnnotation: vi.fn((a: { id?: string; type: string; [key: string]: unknown }) => {
      annotations.push({ ...a, id: a.id ?? `ann-${annotations.length}` });
    }),
    removeAnnotation: vi.fn((id: string) => {
      const i = annotations.findIndex((a) => a.id === id);
      if (i >= 0) annotations.splice(i, 1);
    }),
    getAnnotations: vi.fn(() => [...annotations]),
  };

  const ctx = {
    chart,
    coords: {
      pixelToDataX: (px: number) => px,
      pixelToDataY: (py: number) => py,
      dataToPixelX: (x: number) => x,
      dataToPixelY: (y: number) => y,
      pickPoint: () => null,
    },
    data: {
      getAllSeries: () => [],
      getSeries: () => undefined,
      getSeriesData: () => undefined,
      getViewBounds: () => ({ xMin: 0, xMax: 100, yMin: 0, yMax: 100 }),
      getYAxisBounds: () => ({ yMin: 0, yMax: 100 }),
      getAnnotations: () => [],
      getSelectedPoints: () => [],
    },
    requestRender: vi.fn(),
    render: {
      plotArea: { x: 60, y: 40, width: 400, height: 240 },
      ctx2d: null,
      pixelRatio: 1,
      canvasSize: { width: 500, height: 320 },
    },
  } as unknown as PluginContext;

  function interact(
    plugin: ReturnType<typeof PluginDrawingTools>,
    ...events: InteractionEvent[]
  ) {
    for (const event of events) {
      plugin.onInteraction!(ctx, event);
    }
  }

  return { ctx, chart, annotations, interact };
}

describe("PluginDrawingTools", () => {
  it("adds horizontal line on mousedown", () => {
    const plugin = PluginDrawingTools({ color: "#fff", autoDeselect: false });
    const { ctx, annotations, interact } = createContext();
    plugin.onInit!(ctx);

    const api = plugin.api as DrawingToolsAPI;
    api.setMode("horizontal");
    interact(plugin, createInteractionEvent("mousedown", 10, 42));

    expect(annotations).toHaveLength(1);
    expect(annotations[0].type).toBe("horizontal-line");
    expect(annotations[0].y).toBe(42);
  });

  it("calls preventDefault on mousedown when a drawing tool is active", () => {
    const plugin = PluginDrawingTools();
    const { ctx, interact } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("trendline");

    const down = createInteractionEvent("mousedown", 1, 2);
    interact(plugin, down);
    expect(down.defaultPrevented).toBe(true);
  });

  it("adds trendline via drag-to-draw", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, annotations, interact } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("trendline");

    interact(
      plugin,
      createInteractionEvent("mousedown", 1, 2),
      createInteractionEvent("mousemove", 20, 30),
      createInteractionEvent("mouseup", 20, 30),
    );

    expect(annotations).toHaveLength(1);
    expect(annotations[0].type).toBe("arrow");
    expect(annotations[0].x1).toBe(1);
    expect(annotations[0].y1).toBe(2);
    expect(annotations[0].x2).toBe(20);
    expect(annotations[0].y2).toBe(30);
  });

  it("adds trendline after two clicks (no drag)", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, annotations, interact } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("trendline");

    interact(
      plugin,
      createInteractionEvent("mousedown", 1, 2),
      createInteractionEvent("mouseup", 1, 2),
      createInteractionEvent("mousedown", 5, 8),
    );

    expect(annotations).toHaveLength(1);
    expect(annotations[0].type).toBe("arrow");
  });

  it("adds rectangle via drag-to-draw", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, annotations, interact } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("rectangle");

    interact(
      plugin,
      createInteractionEvent("mousedown", 1, 2),
      createInteractionEvent("mousemove", 9, 8),
      createInteractionEvent("mouseup", 9, 8),
    );

    expect(annotations[0].type).toBe("rectangle");
  });

  it("adds fibonacci retracement levels via drag", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, annotations, interact } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("fibonacci");

    interact(
      plugin,
      createInteractionEvent("mousedown", 1, 20),
      createInteractionEvent("mousemove", 5, 80),
      createInteractionEvent("mouseup", 5, 80),
    );

    expect(annotations.length).toBeGreaterThanOrEqual(5);
    expect(annotations.every((a) => a.type === "horizontal-line")).toBe(true);
    // Each level label carries both the percentage and the computed price.
    expect(annotations.every((a) => /%/.test(String(a.label)))).toBe(true);
    expect(annotations.some((a) => /\d/.test(String(a.label).replace(/[\d.]+%/, "")))).toBe(true);
  });

  it("adds measure box + arrow + label via drag-to-draw (up = green)", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, annotations, interact } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("measure");

    interact(
      plugin,
      createInteractionEvent("mousedown", 1, 10),
      createInteractionEvent("mousemove", 30, 50),
      createInteractionEvent("mouseup", 30, 50),
    );

    expect(annotations).toHaveLength(3);
    const rect = annotations.find((a) => a.type === "rectangle")!;
    const arrow = annotations.find((a) => a.type === "arrow")!;
    const text = annotations.find((a) => a.type === "text")!;
    expect(rect.strokeColor).toBe("#26a69a");
    expect(arrow.color).toBe("#26a69a");
    expect(text.text).toContain("%");
    expect(text.backgroundColor).toBe("#26a69a");
  });

  it("uses down color for a falling measure", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, annotations, interact } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("measure");

    interact(
      plugin,
      createInteractionEvent("mousedown", 1, 80),
      createInteractionEvent("mousemove", 30, 20),
      createInteractionEvent("mouseup", 30, 20),
    );

    const rect = annotations.find((a) => a.type === "rectangle")!;
    expect(rect.strokeColor).toBe("#ef5350");
  });

  it("undo removes all measure annotations together", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, interact } = createContext();
    plugin.onInit!(ctx);
    const api = plugin.api as DrawingToolsAPI;
    api.setMode("measure");
    interact(
      plugin,
      createInteractionEvent("mousedown", 1, 10),
      createInteractionEvent("mousemove", 30, 50),
      createInteractionEvent("mouseup", 30, 50),
    );
    expect(ctx.chart.getAnnotations()).toHaveLength(3);
    expect(api.undo()).toBe(true);
    expect(ctx.chart.getAnnotations()).toHaveLength(0);
  });

  it("auto-deselects to none after completing a stroke", () => {
    const onModeChange = vi.fn();
    const plugin = PluginDrawingTools({ onModeChange });
    const { ctx, interact } = createContext();
    plugin.onInit!(ctx);
    const api = plugin.api as DrawingToolsAPI;
    api.setMode("vertical");

    interact(plugin, createInteractionEvent("mousedown", 99, 1));

    expect(api.getMode()).toBe("none");
    expect(onModeChange).toHaveBeenCalledWith("none");
  });

  it("undo restores previous annotation snapshot", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, interact } = createContext();
    plugin.onInit!(ctx);

    const api = plugin.api as DrawingToolsAPI;
    api.setMode("vertical");
    interact(plugin, createInteractionEvent("mousedown", 99, 1));
    expect(api.undo()).toBe(true);
    expect(ctx.chart.getAnnotations()).toHaveLength(0);
  });

  it("ignores interaction in pan mode", () => {
    const plugin = PluginDrawingTools();
    const { ctx, annotations, interact } = createContext();
    plugin.onInit!(ctx);

    (plugin.api as DrawingToolsAPI).setMode("pan");
    const down = createInteractionEvent("mousedown", 1, 1);
    interact(plugin, down);
    expect(annotations).toHaveLength(0);
    expect(down.defaultPrevented).toBe(false);
  });

  it("undo restores a non-empty previous snapshot", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, interact } = createContext();
    plugin.onInit!(ctx);
    const api = plugin.api as DrawingToolsAPI;
    api.setMode("vertical");
    interact(plugin, createInteractionEvent("mousedown", 5, 1));
    interact(plugin, createInteractionEvent("mousedown", 40, 1));
    expect(ctx.chart.getAnnotations()).toHaveLength(2);
    // prev snapshot here holds the first line, so the restore loop iterates.
    expect(api.undo()).toBe(true);
    expect(ctx.chart.getAnnotations()).toHaveLength(1);
    // redo brings the second line back (next snapshot non-empty).
    expect(api.redo()).toBe(true);
    expect(ctx.chart.getAnnotations()).toHaveLength(2);
  });

  it("redo restores undone annotation", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, interact } = createContext();
    plugin.onInit!(ctx);
    const api = plugin.api as DrawingToolsAPI;
    api.setMode("vertical");
    interact(plugin, createInteractionEvent("mousedown", 5, 1));
    expect(ctx.chart.getAnnotations()).toHaveLength(1);
    api.undo();
    expect(ctx.chart.getAnnotations()).toHaveLength(0);
    api.redo();
    expect(ctx.chart.getAnnotations()).toHaveLength(1);
  });

  it("clear removes all annotations", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, interact } = createContext();
    plugin.onInit!(ctx);
    const api = plugin.api as DrawingToolsAPI;
    api.setMode("horizontal");
    interact(plugin, createInteractionEvent("mousedown", 1, 10));
    api.clear();
    expect(ctx.chart.getAnnotations()).toHaveLength(0);
  });

  it("setMagnet toggles magnet state", () => {
    const plugin = PluginDrawingTools({ magnet: false });
    const api = plugin.api as DrawingToolsAPI;
    expect(api.isMagnet()).toBe(false);
    api.setMagnet(true);
    expect(api.isMagnet()).toBe(true);
  });

  it("setMode notifies onModeChange", () => {
    const onModeChange = vi.fn();
    const plugin = PluginDrawingTools({ onModeChange });
    const { ctx } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("rectangle");
    expect(onModeChange).toHaveBeenCalledWith("rectangle");
  });

  it("onExportSVG emits the in-progress preview stroke", () => {
    const plugin = PluginDrawingTools();
    const { ctx, interact } = createContext();
    plugin.onInit!(ctx);

    (plugin.api as DrawingToolsAPI).setMode("trendline");
    interact(
      plugin,
      createInteractionEvent("mousedown", 10, 20),
      createInteractionEvent("mousemove", 40, 50),
    );

    const pushed: string[] = [];
    const builder = {
      push: (_layer: string, el: string) => {
        pushed.push(el);
      },
      registerClipPath: vi.fn(),
    };

    const xScale = new LinearScale();
    xScale.setDomain(0, 100);
    xScale.setRange(60, 460);
    const yScale = new LinearScale();
    yScale.setDomain(0, 100);
    yScale.setRange(280, 40);

    const svgCtx = {
      builder,
      plotArea: { x: 60, y: 40, width: 400, height: 240 },
      viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 },
      xScale,
      yScales: new Map([["default", yScale]]),
      series: [],
      theme: {} as SVGExportPluginContext["theme"],
      width: 520,
      height: 320,
      exportContext: { options: {} },
    } as unknown as SVGExportPluginContext;

    plugin.onExportSVG!(svgCtx);
    expect(pushed.some((el) => el.includes("<line"))).toBe(true);
  });

  it("onExportSVG does not re-export committed annotations (owned by annotations plugin)", () => {
    const plugin = PluginDrawingTools();
    const { ctx } = createContext();
    plugin.onInit!(ctx);
    ctx.chart.addAnnotation({ id: "h1", type: "horizontal-line", y: 10, color: "#fff" });

    const pushed: string[] = [];
    const builder = {
      push: (_layer: string, el: string) => {
        pushed.push(el);
      },
      registerClipPath: vi.fn(),
    };

    const xScale = new LinearScale();
    xScale.setDomain(0, 100);
    xScale.setRange(60, 460);
    const yScale = new LinearScale();
    yScale.setDomain(0, 100);
    yScale.setRange(280, 40);

    const svgCtx = {
      builder,
      plotArea: { x: 60, y: 40, width: 400, height: 240 },
      viewBounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 },
      xScale,
      yScales: new Map([["default", yScale]]),
      series: [],
      theme: {} as SVGExportPluginContext["theme"],
      width: 520,
      height: 320,
      exportContext: { options: { includeAnnotations: true } },
    } as unknown as SVGExportPluginContext;

    // No active drawing → nothing to emit (committed annotations are exported
    // by the annotations plugin, not here, to avoid double-rendering).
    plugin.onExportSVG!(svgCtx);
    expect(pushed).toHaveLength(0);
  });
});
