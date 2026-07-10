/**
 * Series Actions (Add, Remove, Append)
 */
import { Series } from "../../Series";
import type {
  SeriesOptions,
  HeatmapOptions,
  SeriesUpdateData,
} from "../../../types";
import { updateSeriesBuffer } from "./SeriesBuffer";
import {
  applySeriesOptionsPreprocessors,
  expandSeriesOptions,
} from "./seriesOptionsRegistry";

export function addSeries(
  ctx: any,
  options: SeriesOptions | HeatmapOptions
): void {
  for (const item of expandSeriesOptions(options)) {
    addSeriesOne(ctx, item);
  }
}

function addSeriesOne(
  ctx: any,
  options: SeriesOptions | HeatmapOptions
): void {
  const prepared = applySeriesOptionsPreprocessors(ctx, options);
  if (prepared.type !== 'heatmap' && !prepared.style?.color && !(prepared as any).color && ctx.colorScheme) {
    const seriesIndex = ctx.series.size;
    const schemeColor = ctx.colorScheme.colors[seriesIndex % ctx.colorScheme.colors.length];
    if (!prepared.style) {
      prepared.style = {};
    }
    (prepared.style as any).color = schemeColor;
  }
  
  const s = new Series(prepared);
  ctx.series.set(s.getId(), s);
  updateSeriesBuffer(ctx, s);
  if (
    ctx.xAxisOptions.auto ||
    Array.from(ctx.yAxisOptionsMap.values()).some((o: any) => o.auto)
  ) {
    ctx.autoScale(false);
  }
  ctx.updateLegend?.();
  ctx.requestRender();
}

export function removeSeries(ctx: any, id: string): void {
  const s = ctx.series.get(id);
  if (s) {
    ctx.renderer.deleteBuffer(id);
    ctx.renderer.deleteBuffer(`${id}_step`);
    s.destroy();
    ctx.series.delete(id);
    ctx.updateLegend?.();
    ctx.requestRender();
  }
}

const dataPreprocessors: Array<
  (ctx: unknown, data: SeriesUpdateData) => SeriesUpdateData
> = [];

export function registerSeriesDataPreprocessor(
  fn: (ctx: unknown, data: SeriesUpdateData) => SeriesUpdateData,
): void {
  dataPreprocessors.push(fn);
}

function applyDataPreprocessors(
  ctx: unknown,
  data: SeriesUpdateData,
): SeriesUpdateData {
  let result = data;
  for (const fn of dataPreprocessors) {
    result = fn(ctx, result);
  }
  return result;
}

export function updateSeries(
  ctx: any,
  id: string,
  data: SeriesUpdateData
): void {
  const s = ctx.series.get(id);
  if (!s) return;

  const isAppend = !!data.append;
  const oldMaxX = isAppend ? (s.getBounds()?.xMax ?? -Infinity) : -Infinity;

  const patch = applyDataPreprocessors(ctx, data);
  s.updateData(patch);
  updateSeriesBuffer(ctx, s);

  if (isAppend) {
    applyStreamingViewport(ctx, s, oldMaxX);
  }

  ctx.requestRender();
}

function applyStreamingViewport(ctx: any, series: Series, oldMaxX: number): void {
  if (ctx.autoScrollEnabled) {
    const newBounds = series.getBounds();
    if (newBounds) {
      const xRange = ctx.viewBounds.xMax - ctx.viewBounds.xMin;
      if (oldMaxX >= ctx.viewBounds.xMax - Math.max(xRange * 0.05, 1e-9)) {
        const range = xRange > 0 ? xRange : Math.max(newBounds.xMax - newBounds.xMin, 1);
        ctx.viewBounds.xMax = newBounds.xMax;
        ctx.viewBounds.xMin = ctx.viewBounds.xMax - range;
      }
    }
    if (Array.from(ctx.yAxisOptionsMap.values()).some((o: any) => o.auto)) {
      ctx.autoScaleYOnly();
    }
    return;
  }

  if (Array.from(ctx.yAxisOptionsMap.values()).some((o: any) => o.auto)) {
    ctx.autoScaleYOnly();
  }
  if (ctx.xAxisOptions.auto) {
    const newBounds = series.getBounds();
    if (newBounds) {
      const currentXRange = ctx.viewBounds.xMax - ctx.viewBounds.xMin;
      const dataXRange = newBounds.xMax - newBounds.xMin;
      if (
        newBounds.xMax > ctx.viewBounds.xMax ||
        newBounds.xMin < ctx.viewBounds.xMin ||
        (currentXRange > 0 && Math.abs(dataXRange - currentXRange) / currentXRange > 0.1)
      ) {
        const xPad = Math.min(dataXRange * 0.005, 1e10);
        ctx.viewBounds.xMin = Math.max(-1e15, newBounds.xMin - xPad);
        ctx.viewBounds.xMax = Math.min(1e15, newBounds.xMax + xPad);
      }
    }
  }
}

export function appendData(
  ctx: any,
  id: string,
  x: number[] | Float32Array,
  y: number[] | Float32Array
): void {
  const s = ctx.series.get(id);
  if (!s) return;
  const oldMaxX = s.getBounds()?.xMax ?? -Infinity;
  s.updateData({ x: x as any, y: y as any, append: true });
  updateSeriesBuffer(ctx, s);
  applyStreamingViewport(ctx, s, oldMaxX);
  ctx.requestRender();
}

export function setMaxPoints(ctx: any, id: string, maxPoints: number): void {
  const s = ctx.series.get(id);
  if (s) {
    s.setMaxPoints(maxPoints);
    ctx.requestRender();
  }
}
