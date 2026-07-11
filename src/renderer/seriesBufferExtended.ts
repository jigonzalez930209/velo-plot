/**
 * Extended series buffer handlers (bar, heatmap, candlestick, polar, boxplot, waterfall).
 */
import { Series } from "../core/Series";
import { interleaveBarData, calculateBarWidth } from "./BarRenderer";
import { interleaveHeatmapData, getColormap } from "./HeatmapRenderer";
import { interleaveCandlestickData } from "./CandlestickRenderer";
import {
  interleavePolarFillData,
  interleavePolarLineData,
} from "./PolarRenderer";
import {
  interleaveBoxPlotData,
  interleaveWaterfallData,
} from "./native/utilsExtended";
import {
  interleaveBandData,
  interleaveData,
  interleaveErrorData,
  interleaveStepData,
} from "./native/utilsCore";
import { registerSeriesBufferHandler } from "../core/chart/series/seriesTypeRegistry";

const CORE_LITE_TYPES = new Set([
  "line",
  "scatter",
  "line+scatter",
  "step",
  "step+scatter",
  "band",
  "area",
]);

function updateErrorAndStepBuffers(ctx: any, s: Series): void {
  const d = s.getData();
  const seriesId = s.getId();
  const seriesType = s.getType();

  if (s.hasErrorData()) {
    const errData = interleaveErrorData(
      d.x,
      d.y,
      {
        yError: d.yError,
        yErrorMinus: d.yErrorMinus,
        yErrorPlus: d.yErrorPlus,
      },
      {
        xError: d.xError,
        xErrorMinus: d.xErrorMinus,
        xErrorPlus: d.xErrorPlus,
      },
    );
    ctx.renderer.createBuffer(`${seriesId}_errors`, errData);
  }

  if (seriesType === "step" || seriesType === "step+scatter") {
    const stepMode = s.getStyle().stepMode ?? "after";
    ctx.renderer.createBuffer(
      `${seriesId}_step`,
      interleaveStepData(d.x, d.y, stepMode),
    );
  }
}

function updateBarBuffer(ctx: any, s: Series): void {
  const d = s.getData();
  const barWidth = (s.getStyle() as any).barWidth ?? calculateBarWidth(d.x);
  ctx.renderer.createBuffer(
    s.getId(),
    interleaveBarData(d.x, d.y, barWidth),
  );
  updateErrorAndStepBuffers(ctx, s);
  s.resetLastAppendCount();
}

function updateHeatmapBuffer(ctx: any, s: Series): void {
  const hData = s.getHeatmapData();
  const hStyle = s.getHeatmapStyle();
  if (!hData || hData.xValues.length < 2) return;
  // GPU-only setup: the SVG renderer draws heatmaps directly from
  // getHeatmapData(), so guard WebGL-specific calls so non-WebGL renderers
  // don't throw (e.g. renderer: 'svg').
  if (typeof ctx.renderer?.createColormapTexture !== "function") {
    s.resetLastAppendCount();
    return;
  }
  ctx.renderer.installHeatmapProgram?.();
  ctx.renderer.createBuffer(
    s.getId(),
    interleaveHeatmapData(hData.xValues, hData.yValues, hData.zValues),
  );
  const colormapName = hStyle?.colorScale?.name || "viridis";
  ctx.renderer.createColormapTexture(
    `${s.getId()}_colormap`,
    getColormap(colormapName),
  );
  s.resetLastAppendCount();
}

function updateCandlestickBuffer(ctx: any, s: Series): void {
  const d = s.getData();
  const seriesId = s.getId();
  if (d.open && d.high && d.low && d.close) {
    const barWidth = (s.getStyle() as any).barWidth ?? calculateBarWidth(d.x);
    const hollow = Boolean((s.getStyle() as any).hollow);
    const { bullish, bearish } = interleaveCandlestickData(
      d.x,
      d.open,
      d.high,
      d.low,
      d.close,
      barWidth,
      hollow,
    );
    ctx.renderer.createBuffer(`${seriesId}_bullish`, bullish);
    ctx.renderer.createBuffer(`${seriesId}_bearish`, bearish);
    s.bullishCount = bullish.length / 2;
    s.bearishCount = bearish.length / 2;
  }
  s.resetLastAppendCount();
}

function updateBoxplotBuffer(ctx: any, s: Series): void {
  const d = s.getData();
  const seriesId = s.getId();
  if (d.low && d.open && d.median && d.close && d.high) {
    const barWidth = (s.getStyle() as any).barWidth ?? calculateBarWidth(d.x);
    const { lines, boxes } = interleaveBoxPlotData(
      d.x,
      d.low,
      d.open,
      d.median,
      d.close,
      d.high,
      barWidth,
    );
    ctx.renderer.createBuffer(`${seriesId}_box_lines`, lines);
    ctx.renderer.createBuffer(`${seriesId}_box_faces`, boxes);
  }
  s.resetLastAppendCount();
}

function updateWaterfallBuffer(ctx: any, s: Series): void {
  const d = s.getData();
  const seriesId = s.getId();
  const barWidth = (s.getStyle() as any).barWidth ?? calculateBarWidth(d.x);
  const isSubtotal = (s.getStyle() as any).isSubtotal;
  const wfData = interleaveWaterfallData(d.x, d.y, barWidth, isSubtotal);
  ctx.renderer.createBuffer(`${seriesId}_wf_positive`, wfData.positiveData);
  ctx.renderer.createBuffer(`${seriesId}_wf_negative`, wfData.negativeData);
  ctx.renderer.createBuffer(`${seriesId}_wf_subtotal`, wfData.subtotalData);
  ctx.renderer.createBuffer(`${seriesId}_wf_connectors`, wfData.connectorData);
  s.waterfallCounts = {
    positive: wfData.positiveCount,
    negative: wfData.negativeCount,
    subtotal: wfData.subtotalCount,
    connectors: wfData.connectorData.length / 2,
  };
  s.resetLastAppendCount();
}

function updatePolarBuffer(ctx: any, s: Series): void {
  const polarData = s.getPolarData();
  if (!polarData || polarData.r.length === 0) return;

  const style = s.getStyle() as any;
  const angleMode = style.angleMode || "degrees";
  const closePath = style.closePath !== false;
  const fill = style.fill || false;

  if (fill) {
    const fillData = interleavePolarFillData(polarData, angleMode, closePath);
    ctx.renderer.createBuffer(s.getId(), fillData);
  } else {
    const lineData = interleavePolarLineData(polarData, angleMode, closePath);
    ctx.renderer.createBuffer(s.getId(), lineData);
  }
  s.resetLastAppendCount();
}

function updateBandOrAreaBuffer(ctx: any, s: Series): void {
  const d = s.getData();
  const seriesType = s.getType();
  const y2 =
    seriesType === "area"
      ? new Float32Array(d.x.length).fill(0)
      : d.y2 || new Float32Array(d.x.length).fill(0);
  ctx.renderer.createBuffer(s.getId(), interleaveBandData(d.x, d.y, y2));
  updateErrorAndStepBuffers(ctx, s);
  s.resetLastAppendCount();
}

function updateDefaultBuffer(ctx: any, s: Series): void {
  const d = s.getData();
  ctx.renderer.createBuffer(s.getId(), interleaveData(d.x, d.y));
  updateErrorAndStepBuffers(ctx, s);
  s.resetLastAppendCount();
}

let registered = false;

/** Register extended series buffer handlers (call from trading/scientific/full entries). */
export function registerExtendedSeriesBuffers(): void {
  if (registered) return;
  registered = true;

  registerSeriesBufferHandler("bar", updateBarBuffer);
  registerSeriesBufferHandler("heatmap", updateHeatmapBuffer);
  registerSeriesBufferHandler("candlestick", updateCandlestickBuffer);
  registerSeriesBufferHandler("boxplot", updateBoxplotBuffer);
  registerSeriesBufferHandler("waterfall", updateWaterfallBuffer);
  registerSeriesBufferHandler("polar", updatePolarBuffer);
  registerSeriesBufferHandler("band", updateBandOrAreaBuffer);
  registerSeriesBufferHandler("area", updateBandOrAreaBuffer);
  registerSeriesBufferHandler("heikin-ashi", (ctx: any, s) => {
    const d = s.getData();
    if (!d?.x?.length) return;
    ctx.renderer.createBuffer(s.getId(), interleaveData(d.x, d.y));
    s.resetLastAppendCount();
  });

  for (const type of [
    "line",
    "scatter",
    "line+scatter",
    "step",
    "step+scatter",
  ]) {
    registerSeriesBufferHandler(type, updateDefaultBuffer);
  }
}

export { CORE_LITE_TYPES };
