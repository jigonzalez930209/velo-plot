/**
 * PluginDrawingTools — interactive drawing on chart (Stage 2.9 MVP).
 */

import type { ChartPlugin, PluginContext, PluginManifest } from "../types";
import type { Annotation } from "../../core/annotations/types";

export type DrawingMode =
  | "none"
  | "pan"
  | "trendline"
  | "horizontal"
  | "vertical"
  | "rectangle";

export interface PluginDrawingToolsConfig {
  /** Default stroke color */
  color?: string;
}

export interface DrawingToolsAPI {
  setMode(mode: DrawingMode): void;
  getMode(): DrawingMode;
  undo(): boolean;
  redo(): boolean;
  clear(): void;
}

const manifest: PluginManifest = {
  name: "velo-plot-drawing-tools",
  version: "1.0.0",
  description: "Interactive trendline, horizontal, vertical, and rectangle drawing",
  provides: ["drawing"],
  tags: ["drawing", "annotations", "trading"],
};

interface DrawState {
  mode: DrawingMode;
  pending: { x: number; y: number } | null;
  undoStack: Annotation[][];
  redoStack: Annotation[][];
}

export function PluginDrawingTools(
  config: PluginDrawingToolsConfig = {},
): ChartPlugin<PluginDrawingToolsConfig> {
  let ctx: PluginContext | null = null;
  let state: DrawState = {
    mode: "none",
    pending: null,
    undoStack: [],
    redoStack: [],
  };
  let clickHandler: ((e: { point: { x: number; y: number } }) => void) | null = null;

  const stroke = config.color ?? "#38bdf8";

  function snapshot(): Annotation[] {
    return ctx?.chart.getAnnotations?.() ?? [];
  }

  function pushUndo(): void {
    state.undoStack.push(snapshot());
    state.redoStack = [];
  }

  const api: DrawingToolsAPI & Record<string, unknown> = {
    setMode(mode) {
      state.mode = mode;
      state.pending = null;
    },
    getMode() {
      return state.mode;
    },
    undo() {
      if (!ctx || state.undoStack.length === 0) return false;
      state.redoStack.push(snapshot());
      const prev = state.undoStack.pop()!;
      const current = snapshot();
      for (const a of current) ctx.chart.removeAnnotation(a.id!);
      for (const a of prev) ctx.chart.addAnnotation(a);
      return true;
    },
    redo() {
      if (!ctx || state.redoStack.length === 0) return false;
      state.undoStack.push(snapshot());
      const next = state.redoStack.pop()!;
      const current = snapshot();
      for (const a of current) ctx.chart.removeAnnotation(a.id!);
      for (const a of next) ctx.chart.addAnnotation(a);
      return true;
    },
    clear() {
      if (!ctx) return;
      pushUndo();
      for (const a of snapshot()) ctx.chart.removeAnnotation(a.id!);
    },
  };

  return {
    manifest,
    api,
    onInit(pluginCtx) {
      ctx = pluginCtx;
      clickHandler = (evt) => {
        if (!ctx || state.mode === "none" || state.mode === "pan") return;
        const { x, y } = evt.point;

        if (state.mode === "horizontal") {
          pushUndo();
          ctx.chart.addAnnotation({
            type: "horizontal-line",
            y,
            color: stroke,
            interactive: true,
          });
          return;
        }

        if (state.mode === "vertical") {
          pushUndo();
          ctx.chart.addAnnotation({
            type: "vertical-line",
            x,
            color: stroke,
            interactive: true,
          });
          return;
        }

        if (!state.pending) {
          state.pending = { x, y };
          return;
        }

        const p0 = state.pending;
        state.pending = null;
        pushUndo();

        if (state.mode === "trendline") {
          ctx.chart.addAnnotation({
            type: "arrow",
            x1: p0.x,
            y1: p0.y,
            x2: x,
            y2: y,
            color: stroke,
            interactive: true,
          });
        } else if (state.mode === "rectangle") {
          ctx.chart.addAnnotation({
            type: "rectangle",
            xMin: Math.min(p0.x, x),
            xMax: Math.max(p0.x, x),
            yMin: Math.min(p0.y, y),
            yMax: Math.max(p0.y, y),
            strokeColor: stroke,
            fillColor: stroke + "22",
            interactive: true,
          });
        }
      };

      ctx.chart.on("click", clickHandler);
    },
    onDestroy(pluginCtx) {
      if (clickHandler) {
        pluginCtx.chart.off("click", clickHandler);
      }
      ctx = null;
      clickHandler = null;
    },
  };
}

export default PluginDrawingTools;
