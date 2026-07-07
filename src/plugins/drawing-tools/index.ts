/**
 * PluginDrawingTools — interactive drawing on chart (Stage 2.9).
 * TradingView-style live preview, drag-to-draw, optional candle magnet.
 */

import type { ChartPlugin, InteractionEvent, PluginContext, PluginManifest } from "../types";
import type { Annotation } from "../../core/annotations/types";
import type { Series } from "../../core/Series";
import { snapToCandle } from "./snapToCandle";
import { computeMeasurement, formatMeasurement, formatPrice } from "./measure";

export type DrawingMode =
  | "none"
  | "pan"
  | "trendline"
  | "horizontal"
  | "vertical"
  | "rectangle"
  | "fibonacci"
  | "measure";

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const DRAG_THRESHOLD_PX = 4;
const DEFAULT_MEASURE_UP = "#26a69a";
const DEFAULT_MEASURE_DOWN = "#ef5350";

export interface PluginDrawingToolsConfig {
  /** Default stroke color */
  color?: string;
  /** Enable candle magnet by default */
  magnet?: boolean;
  /** Return to pan mode after each completed stroke (default true) */
  autoDeselect?: boolean;
  /** Notified when drawing mode changes (including auto-deselect to none) */
  onModeChange?: (mode: DrawingMode) => void;
  /** Color for upward measurements (default green) */
  measureUpColor?: string;
  /** Color for downward measurements (default red) */
  measureDownColor?: string;
}

function withAlpha(color: string, alpha: string): string {
  return color.startsWith("#") && color.length === 7 ? color + alpha : color;
}

export interface DrawingToolsAPI {
  setMode(mode: DrawingMode): void;
  getMode(): DrawingMode;
  setMagnet(enabled: boolean): void;
  isMagnet(): boolean;
  undo(): boolean;
  redo(): boolean;
  clear(): void;
}

const manifest: PluginManifest = {
  name: "velo-plot-drawing-tools",
  version: "1.0.0",
  description: "Interactive trendline, horizontal, vertical, rectangle, and fibonacci drawing",
  provides: ["drawing"],
  tags: ["drawing", "annotations", "trading"],
};

interface DrawPoint {
  x: number;
  y: number;
}

interface DrawState {
  mode: DrawingMode;
  pending: DrawPoint | null;
  start: DrawPoint | null;
  dragging: boolean;
  dragMoved: boolean;
  dragStartPixel: { x: number; y: number } | null;
  cursor: DrawPoint | null;
  magnet: boolean;
  undoStack: Annotation[][];
  redoStack: Annotation[][];
}

function isDrawingMode(mode: DrawingMode): boolean {
  return mode !== "none" && mode !== "pan";
}

function findCandlestickSeries(ctx: PluginContext): Series | undefined {
  for (const s of ctx.data.getAllSeries()) {
    if (s.getType() === "candlestick") return s;
  }
  return undefined;
}

export function PluginDrawingTools(
  config: PluginDrawingToolsConfig = {},
): ChartPlugin<PluginDrawingToolsConfig> {
  let ctx: PluginContext | null = null;
  const autoDeselect = config.autoDeselect !== false;
  let state: DrawState = {
    mode: "none",
    pending: null,
    start: null,
    dragging: false,
    dragMoved: false,
    dragStartPixel: null,
    cursor: null,
    magnet: config.magnet ?? false,
    undoStack: [],
    redoStack: [],
  };

  const stroke = config.color ?? "#38bdf8";
  const measureUp = config.measureUpColor ?? DEFAULT_MEASURE_UP;
  const measureDown = config.measureDownColor ?? DEFAULT_MEASURE_DOWN;

  function snapshot(): Annotation[] {
    return ctx?.chart.getAnnotations?.() ?? [];
  }

  function pushUndo(): void {
    state.undoStack.push(snapshot());
    state.redoStack = [];
  }

  function resetInteractionState(): void {
    state.pending = null;
    state.start = null;
    state.dragging = false;
    state.dragMoved = false;
    state.dragStartPixel = null;
  }

  function setModeInternal(mode: DrawingMode): void {
    state.mode = mode;
    resetInteractionState();
    config.onModeChange?.(mode);
    ctx?.requestRender?.();
  }

  function finishStroke(): void {
    resetInteractionState();
    if (autoDeselect) {
      setModeInternal("none");
    } else {
      ctx?.requestRender?.();
    }
  }

  function resolvePoint(x: number, y: number): DrawPoint {
    if (!ctx || !state.magnet) return { x, y };
    const series = findCandlestickSeries(ctx);
    if (!series) return { x, y };
    const d = series.getData();
    if (!d.open || !d.high || !d.low || !d.close) return { x, y };
    return snapToCandle({
      x,
      y,
      barX: d.x,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      dataToPixelX: (dx) => ctx!.coords.dataToPixelX(dx),
      dataToPixelY: (dy) => ctx!.coords.dataToPixelY(dy),
      enabled: true,
    });
  }

  function pointFromEvent(pluginCtx: PluginContext, event: InteractionEvent): DrawPoint {
    return resolvePoint(
      pluginCtx.coords.pixelToDataX(event.pixelX),
      pluginCtx.coords.pixelToDataY(event.pixelY),
    );
  }

  function commitHorizontal(y: number): void {
    if (!ctx) return;
    pushUndo();
    ctx.chart.addAnnotation({
      type: "horizontal-line",
      y,
      color: stroke,
      interactive: true,
    });
  }

  function commitVertical(x: number): void {
    if (!ctx) return;
    pushUndo();
    ctx.chart.addAnnotation({
      type: "vertical-line",
      x,
      color: stroke,
      interactive: true,
    });
  }

  function commitMeasure(p0: DrawPoint, p1: DrawPoint): void {
    if (!ctx) return;
    pushUndo();

    const m = computeMeasurement(p0, p1);
    const color = m.up ? measureUp : measureDown;
    const midX = (p0.x + p1.x) / 2;
    ctx.chart.addAnnotation({
      type: "rectangle",
      xMin: Math.min(p0.x, p1.x),
      xMax: Math.max(p0.x, p1.x),
      yMin: Math.min(p0.y, p1.y),
      yMax: Math.max(p0.y, p1.y),
      strokeColor: color,
      fillColor: withAlpha(color, "33"),
      interactive: true,
    });
    ctx.chart.addAnnotation({
      type: "arrow",
      x1: midX,
      y1: p0.y,
      x2: midX,
      y2: p1.y,
      color,
      headStyle: "filled",
      interactive: true,
    });
    ctx.chart.addAnnotation({
      type: "text",
      x: midX,
      y: p1.y,
      text: formatMeasurement(m),
      color: "#ffffff",
      backgroundColor: color,
      padding: 4,
      fontWeight: "bold",
      anchor: m.up ? "bottom-center" : "top-center",
      interactive: true,
    });
  }

  function commitTwoPoint(p0: DrawPoint, p1: DrawPoint): void {
    if (!ctx) return;

    if (state.mode === "measure") {
      commitMeasure(p0, p1);
      return;
    }

    pushUndo();

    if (state.mode === "trendline") {
      ctx.chart.addAnnotation({
        type: "arrow",
        x1: p0.x,
        y1: p0.y,
        x2: p1.x,
        y2: p1.y,
        color: stroke,
        interactive: true,
      });
    } else if (state.mode === "rectangle") {
      ctx.chart.addAnnotation({
        type: "rectangle",
        xMin: Math.min(p0.x, p1.x),
        xMax: Math.max(p0.x, p1.x),
        yMin: Math.min(p0.y, p1.y),
        yMax: Math.max(p0.y, p1.y),
        strokeColor: stroke,
        fillColor: stroke + "22",
        interactive: true,
      });
    } else if (state.mode === "fibonacci") {
      const yMin = Math.min(p0.y, p1.y);
      const yMax = Math.max(p0.y, p1.y);
      for (const level of FIB_LEVELS) {
        const fy = yMax - (yMax - yMin) * level;
        ctx.chart.addAnnotation({
          type: "horizontal-line",
          y: fy,
          color: stroke,
          lineDash: level === 0 || level === 1 ? undefined : [4, 4],
          label: `${(level * 100).toFixed(1)}%  ${formatPrice(fy)}`,
          labelPosition: "right",
          interactive: true,
        });
      }
    }
  }

  function drawPreview(
    c2d: CanvasRenderingContext2D,
    plotArea: { x: number; y: number; width: number; height: number },
    coords: PluginContext["coords"],
  ): void {
    const mode = state.mode;
    if (!isDrawingMode(mode) || !state.cursor) return;

    const cursor = state.cursor;
    const anchor = state.pending ?? state.start;

    c2d.save();
    c2d.strokeStyle = stroke;
    c2d.lineWidth = 1.5;
    c2d.setLineDash([6, 4]);
    c2d.globalAlpha = 0.85;

    const toPx = (x: number, y: number) => ({
      px: coords.dataToPixelX(x),
      py: coords.dataToPixelY(y),
    });

    if (mode === "horizontal") {
      const { py } = toPx(0, cursor.y);
      c2d.beginPath();
      c2d.moveTo(plotArea.x, py);
      c2d.lineTo(plotArea.x + plotArea.width, py);
      c2d.stroke();
    } else if (mode === "vertical") {
      const { px } = toPx(cursor.x, 0);
      c2d.beginPath();
      c2d.moveTo(px, plotArea.y);
      c2d.lineTo(px, plotArea.y + plotArea.height);
      c2d.stroke();
    } else if (anchor) {
      const a = toPx(anchor.x, anchor.y);
      const b = toPx(cursor.x, cursor.y);

      if (mode === "trendline") {
        c2d.beginPath();
        c2d.moveTo(a.px, a.py);
        c2d.lineTo(b.px, b.py);
        c2d.stroke();
      } else if (mode === "rectangle") {
        const x = Math.min(a.px, b.px);
        const y = Math.min(a.py, b.py);
        const w = Math.abs(b.px - a.px);
        const h = Math.abs(b.py - a.py);
        c2d.strokeRect(x, y, w, h);
        c2d.fillStyle = stroke + "22";
        c2d.fillRect(x, y, w, h);
      } else if (mode === "fibonacci") {
        const yMin = Math.min(anchor.y, cursor.y);
        const yMax = Math.max(anchor.y, cursor.y);
        c2d.font = "11px sans-serif";
        c2d.textAlign = "left";
        c2d.textBaseline = "bottom";
        for (const level of FIB_LEVELS) {
          const fy = yMax - (yMax - yMin) * level;
          const { py } = toPx(0, fy);
          c2d.beginPath();
          c2d.moveTo(plotArea.x, py);
          c2d.lineTo(plotArea.x + plotArea.width, py);
          c2d.stroke();
          c2d.save();
          c2d.setLineDash([]);
          c2d.globalAlpha = 1;
          c2d.fillStyle = stroke;
          c2d.fillText(
            `${(level * 100).toFixed(1)}%  ${formatPrice(fy)}`,
            plotArea.x + 4,
            py - 2,
          );
          c2d.restore();
        }
      } else if (mode === "measure") {
        drawMeasurePreview(c2d, a, b, anchor, cursor);
      }
    }

    c2d.restore();
  }

  function drawMeasurePreview(
    c2d: CanvasRenderingContext2D,
    a: { px: number; py: number },
    b: { px: number; py: number },
    anchor: DrawPoint,
    cursor: DrawPoint,
  ): void {
    const m = computeMeasurement(anchor, cursor);
    const color = m.up ? measureUp : measureDown;
    const x = Math.min(a.px, b.px);
    const y = Math.min(a.py, b.py);
    const w = Math.abs(b.px - a.px);
    const h = Math.abs(b.py - a.py);

    c2d.setLineDash([]);
    c2d.globalAlpha = 0.9;
    c2d.fillStyle = withAlpha(color, "33");
    c2d.fillRect(x, y, w, h);
    c2d.strokeStyle = color;
    c2d.lineWidth = 1.5;
    c2d.strokeRect(x, y, w, h);

    // Vertical direction arrow at the horizontal center.
    const midX = (a.px + b.px) / 2;
    c2d.beginPath();
    c2d.moveTo(midX, a.py);
    c2d.lineTo(midX, b.py);
    c2d.stroke();
    const headLen = 7;
    const dir = b.py >= a.py ? 1 : -1;
    c2d.beginPath();
    c2d.moveTo(midX, b.py);
    c2d.lineTo(midX - 4, b.py - dir * headLen);
    c2d.lineTo(midX + 4, b.py - dir * headLen);
    c2d.closePath();
    c2d.fillStyle = color;
    c2d.fill();

    // Label with change / percent / bars.
    const label = formatMeasurement(m);
    c2d.font = "12px sans-serif";
    const textW = c2d.measureText(label).width;
    const padX = 6;
    const boxW = textW + padX * 2;
    const boxH = 20;
    const boxX = midX - boxW / 2;
    const boxY = m.up ? b.py - boxH - 8 : b.py + 8;
    c2d.globalAlpha = 1;
    c2d.fillStyle = color;
    c2d.fillRect(boxX, boxY, boxW, boxH);
    c2d.fillStyle = "#ffffff";
    c2d.textAlign = "center";
    c2d.textBaseline = "middle";
    c2d.fillText(label, midX, boxY + boxH / 2);
  }

  function handleMouseDown(pluginCtx: PluginContext, event: InteractionEvent): void {
    if (!event.inPlotArea) return;

    event.preventDefault();
    const point = pointFromEvent(pluginCtx, event);

    if (state.mode === "horizontal") {
      commitHorizontal(point.y);
      finishStroke();
      return;
    }

    if (state.mode === "vertical") {
      commitVertical(point.x);
      finishStroke();
      return;
    }

    if (state.pending) {
      commitTwoPoint(state.pending, point);
      finishStroke();
      return;
    }

    state.start = point;
    state.dragging = true;
    state.dragMoved = false;
    state.dragStartPixel = { x: event.pixelX, y: event.pixelY };
    state.cursor = point;
    pluginCtx.requestRender?.();
  }

  function handleMouseMove(pluginCtx: PluginContext, event: InteractionEvent): void {
    const point = pointFromEvent(pluginCtx, event);
    state.cursor = point;

    if (state.dragging && state.dragStartPixel) {
      const dx = event.pixelX - state.dragStartPixel.x;
      const dy = event.pixelY - state.dragStartPixel.y;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        state.dragMoved = true;
      }
    }

    event.preventDefault();
    pluginCtx.requestRender?.();
  }

  function handleMouseUp(pluginCtx: PluginContext, event: InteractionEvent): void {
    if (!state.dragging || !state.start) return;

    const point = pointFromEvent(pluginCtx, event);
    const start = state.start;
    state.dragging = false;
    state.dragStartPixel = null;

    if (state.dragMoved) {
      commitTwoPoint(start, point);
      finishStroke();
      return;
    }

    state.pending = start;
    state.start = null;
    state.cursor = point;
    pluginCtx.requestRender?.();
  }

  const api: DrawingToolsAPI & Record<string, unknown> = {
    setMode(mode) {
      setModeInternal(mode);
    },
    getMode() {
      return state.mode;
    },
    setMagnet(enabled) {
      state.magnet = enabled;
    },
    isMagnet() {
      return state.magnet;
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
    },
    onDestroy() {
      ctx = null;
    },
    onInteraction(pluginCtx, event) {
      if (!isDrawingMode(state.mode)) return;

      if (event.type === "mousedown") {
        handleMouseDown(pluginCtx, event);
        return;
      }

      if (event.type === "mousemove") {
        handleMouseMove(pluginCtx, event);
        return;
      }

      if (event.type === "mouseup") {
        handleMouseUp(pluginCtx, event);
      }
    },
    onRenderOverlay(pluginCtx) {
      const c2d = pluginCtx.render.ctx2d;
      if (!c2d) return;
      drawPreview(c2d, pluginCtx.render.plotArea, pluginCtx.coords);
    },
  };
}

export { snapToCandle, findNearestBarIndex } from "./snapToCandle";
export default PluginDrawingTools;
