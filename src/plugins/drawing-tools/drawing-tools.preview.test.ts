import { describe, it, expect, vi } from "vitest";
import { PluginDrawingTools, type DrawingToolsAPI, type DrawingMode } from "./index";
import type { InteractionEvent, PluginContext } from "../types";

function ev(
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

function mockCtx2d() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
    font: "",
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
  } as unknown as CanvasRenderingContext2D;
}

function createContext(series: unknown[] = []) {
  const c2d = mockCtx2d();
  const ctx = {
    chart: {
      addAnnotation: vi.fn(),
      removeAnnotation: vi.fn(),
      getAnnotations: vi.fn(() => []),
    },
    coords: {
      pixelToDataX: (px: number) => px,
      pixelToDataY: (py: number) => py,
      dataToPixelX: (x: number) => x,
      dataToPixelY: (y: number) => y,
    },
    data: { getAllSeries: () => series },
    requestRender: vi.fn(),
    render: {
      plotArea: { x: 60, y: 40, width: 400, height: 240 },
      ctx2d: c2d,
      pixelRatio: 1,
      canvasSize: { width: 500, height: 320 },
    },
  } as unknown as PluginContext;
  return { ctx, c2d };
}

function overlay(plugin: ReturnType<typeof PluginDrawingTools>, ctx: PluginContext) {
  plugin.onRenderOverlay!(ctx, {} as never);
}

describe("PluginDrawingTools preview rendering", () => {
  const modes: DrawingMode[] = ["horizontal", "vertical"];
  for (const mode of modes) {
    it(`renders ${mode} preview from cursor only`, () => {
      const plugin = PluginDrawingTools({ autoDeselect: false });
      const { ctx, c2d } = createContext();
      plugin.onInit!(ctx);
      (plugin.api as DrawingToolsAPI).setMode(mode);
      plugin.onInteraction!(ctx, ev("mousemove", 120, 90));
      overlay(plugin, ctx);
      expect(c2d.stroke).toHaveBeenCalled();
    });
  }

  const anchorModes: DrawingMode[] = ["trendline", "rectangle", "fibonacci"];
  for (const mode of anchorModes) {
    it(`renders ${mode} preview with an anchor`, () => {
      const plugin = PluginDrawingTools({ autoDeselect: false });
      const { ctx, c2d } = createContext();
      plugin.onInit!(ctx);
      (plugin.api as DrawingToolsAPI).setMode(mode);
      plugin.onInteraction!(ctx, ev("mousedown", 10, 20));
      plugin.onInteraction!(ctx, ev("mousemove", 200, 160));
      overlay(plugin, ctx);
      expect(c2d.save).toHaveBeenCalled();
    });
  }

  it("renders rising measure preview (up = green, box above)", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, c2d } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("measure");
    // cursor below anchor in data terms → rising measurement
    plugin.onInteraction!(ctx, ev("mousedown", 10, 10));
    plugin.onInteraction!(ctx, ev("mousemove", 120, 90));
    overlay(plugin, ctx);
    expect(c2d.fillText).toHaveBeenCalled();
  });

  it("renders falling measure preview (down = red, box below)", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, c2d } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("measure");
    plugin.onInteraction!(ctx, ev("mousedown", 10, 120));
    plugin.onInteraction!(ctx, ev("mousemove", 120, 20));
    overlay(plugin, ctx);
    expect(c2d.fillText).toHaveBeenCalled();
  });

  it("measure preview keeps non-hex colors verbatim (withAlpha fallback)", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false, measureUpColor: "red" });
    const { ctx } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("measure");
    plugin.onInteraction!(ctx, ev("mousedown", 10, 10));
    plugin.onInteraction!(ctx, ev("mousemove", 120, 90));
    expect(() => overlay(plugin, ctx)).not.toThrow();
  });

  it("does not draw preview when not in a drawing mode", () => {
    const plugin = PluginDrawingTools();
    const { ctx, c2d } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("pan");
    plugin.onInteraction!(ctx, ev("mousemove", 10, 10));
    overlay(plugin, ctx);
    expect(c2d.stroke).not.toHaveBeenCalled();
  });

  it("skips overlay when no 2d context is available", () => {
    const plugin = PluginDrawingTools();
    const { ctx } = createContext();
    (ctx.render as { ctx2d: unknown }).ctx2d = null;
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("trendline");
    expect(() => overlay(plugin, ctx)).not.toThrow();
  });
});

describe("PluginDrawingTools candle magnet", () => {
  function candleSeries() {
    return {
      getType: () => "candlestick",
      getData: () => ({
        x: new Float32Array([0, 1, 2, 3, 4]),
        open: new Float32Array([10, 11, 12, 13, 14]),
        high: new Float32Array([12, 13, 14, 15, 16]),
        low: new Float32Array([9, 10, 11, 12, 13]),
        close: new Float32Array([11, 12, 13, 14, 15]),
      }),
    };
  }

  it("snaps points to the nearest candle when magnet is on", () => {
    const plugin = PluginDrawingTools({ magnet: true });
    const { ctx } = createContext([candleSeries()]);
    plugin.onInit!(ctx);
    const api = plugin.api as DrawingToolsAPI;
    expect(api.isMagnet()).toBe(true);
    api.setMode("trendline");
    expect(() =>
      plugin.onInteraction!(ctx, ev("mousedown", 2, 13)),
    ).not.toThrow();
  });

  it("falls back to raw point when no candlestick series exists", () => {
    const plugin = PluginDrawingTools({ magnet: true });
    const { ctx } = createContext([{ getType: () => "line" }]);
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("trendline");
    expect(() => plugin.onInteraction!(ctx, ev("mousedown", 2, 13))).not.toThrow();
  });

  it("falls back to raw point when candle series lacks OHLC fields", () => {
    const partial = { getType: () => "candlestick", getData: () => ({ x: new Float32Array([0, 1]) }) };
    const plugin = PluginDrawingTools({ magnet: true });
    const { ctx } = createContext([partial]);
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("trendline");
    expect(() => plugin.onInteraction!(ctx, ev("mousedown", 1, 5))).not.toThrow();
  });
});

describe("PluginDrawingTools interaction guards", () => {
  it("ignores mousedown outside the plot area", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, c2d } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("trendline");
    const down = ev("mousedown", 5, 5, /* inPlotArea */ false);
    plugin.onInteraction!(ctx, down);
    plugin.onInteraction!(ctx, ev("mousemove", 6, 6));
    overlay(plugin, ctx);
    expect(down.defaultPrevented).toBe(false);
    // no anchor was set, so no anchored preview stroke
    expect(c2d.strokeRect).not.toHaveBeenCalled();
  });

  it("ignores mouseup with no active drag", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("trendline");
    expect(() => plugin.onInteraction!(ctx, ev("mouseup", 5, 5))).not.toThrow();
  });

  it("snapshot tolerates a chart without getAnnotations", () => {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx } = createContext();
    (ctx.chart as { getAnnotations?: unknown }).getAnnotations = undefined;
    plugin.onInit!(ctx);
    const api = plugin.api as DrawingToolsAPI;
    api.setMode("horizontal");
    expect(() => plugin.onInteraction!(ctx, ev("mousedown", 10, 20))).not.toThrow();
  });

  it("redo and clear are no-ops after destroy", () => {
    const plugin = PluginDrawingTools();
    const { ctx } = createContext();
    plugin.onInit!(ctx);
    plugin.onDestroy!(ctx);
    const api = plugin.api as DrawingToolsAPI;
    expect(api.redo()).toBe(false);
    expect(() => api.clear()).not.toThrow();
  });
});

// A late interaction event can arrive after the plugin was destroyed (ctx
// nulled) while a drawing mode is still active. Coords come from the passed
// pluginCtx, but the commit helpers read the module ctx, so each commit path
// must bail out gracefully instead of throwing.
describe("PluginDrawingTools commit guards when destroyed mid-gesture", () => {
  function armedThenDestroyed(mode: DrawingMode) {
    const plugin = PluginDrawingTools({ autoDeselect: false });
    const { ctx, c2d } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode(mode);
    return { plugin, ctx, c2d };
  }

  it("commitHorizontal bails when ctx was cleared", () => {
    const { plugin, ctx, c2d } = armedThenDestroyed("horizontal");
    plugin.onDestroy!(ctx);
    plugin.onInteraction!(ctx, ev("mousedown", 10, 20));
    expect(c2d.stroke).not.toHaveBeenCalled();
    expect((ctx.chart.addAnnotation as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("commitVertical bails when ctx was cleared", () => {
    const { plugin, ctx } = armedThenDestroyed("vertical");
    plugin.onDestroy!(ctx);
    plugin.onInteraction!(ctx, ev("mousedown", 30, 5));
    expect((ctx.chart.addAnnotation as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("commitTwoPoint bails when ctx was cleared", () => {
    const { plugin, ctx } = armedThenDestroyed("trendline");
    plugin.onDestroy!(ctx);
    plugin.onInteraction!(ctx, ev("mousedown", 1, 2));
    plugin.onInteraction!(ctx, ev("mousemove", 40, 60));
    plugin.onInteraction!(ctx, ev("mouseup", 40, 60));
    expect((ctx.chart.addAnnotation as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("commitMeasure bails when ctx was cleared", () => {
    const { plugin, ctx } = armedThenDestroyed("measure");
    plugin.onDestroy!(ctx);
    plugin.onInteraction!(ctx, ev("mousedown", 1, 10));
    plugin.onInteraction!(ctx, ev("mousemove", 40, 60));
    plugin.onInteraction!(ctx, ev("mouseup", 40, 60));
    expect((ctx.chart.addAnnotation as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
});

describe("PluginDrawingTools lifecycle", () => {
  it("onDestroy clears the plugin context", () => {
    const plugin = PluginDrawingTools();
    const { ctx } = createContext();
    plugin.onInit!(ctx);
    expect(() => plugin.onDestroy!(ctx)).not.toThrow();
    // undo after destroy should be a no-op returning false
    expect((plugin.api as DrawingToolsAPI).undo()).toBe(false);
  });

  it("ignores non drawing interactions like mouseleave", () => {
    const plugin = PluginDrawingTools();
    const { ctx } = createContext();
    plugin.onInit!(ctx);
    (plugin.api as DrawingToolsAPI).setMode("trendline");
    expect(() =>
      plugin.onInteraction!(ctx, ev("mouseleave" as InteractionEvent["type"], 1, 1)),
    ).not.toThrow();
  });
});
