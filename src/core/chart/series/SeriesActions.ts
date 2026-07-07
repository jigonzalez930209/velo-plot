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
import { buildIndicatorSeries } from "../../indicator/buildIndicatorSeries";
import type { IndicatorSeriesOptions } from "../../indicator/types";
import { computeHeikinAshi } from "../heikinAshi";
import { applyBusinessDayX, isBusinessDayScaleActive } from "../../time/applyTimeScale";

function prepareSeriesOptions(
  ctx: any,
  options: SeriesOptions | HeatmapOptions,
): SeriesOptions | HeatmapOptions {
  if (options.type === "heatmap" || options.type === "indicator") {
    return options;
  }

  let opts = { ...options } as SeriesOptions;

  if ((opts.type as string) === "heikin-ashi") {
    const d = opts.data;
    if (d?.open && d.high && d.low && d.close) {
      const ha = computeHeikinAshi({
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      });
      opts = {
        ...opts,
        type: "candlestick",
        data: { ...d, ...ha },
      };
    }
  }

  if (isBusinessDayScaleActive(ctx.xAxisOptions) && opts.data?.x?.length) {
    const { displayX, mapping } = applyBusinessDayX(opts.data.x, ctx.xAxisOptions);
    ctx.timeScaleMapping = mapping;
    opts = {
      ...opts,
      data: { ...opts.data, x: displayX },
    };
  }

  return opts;
}

function expandSeriesOptions(
  options: SeriesOptions | HeatmapOptions,
): Array<SeriesOptions | HeatmapOptions> {
  if ((options as SeriesOptions).type === "indicator") {
    return buildIndicatorSeries(options as IndicatorSeriesOptions);
  }
  return [options];
}

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
  const prepared = prepareSeriesOptions(ctx, options);
  // Auto-assign color from scheme if not provided (skip for heatmaps)
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
    // Don't animate autoscale when adding series to avoid animation conflicts
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

export function updateSeries(
  ctx: any,
  id: string,
  data: SeriesUpdateData
): void {
  const s = ctx.series.get(id);
  if (s) {
    let patch = data;
    if (data.x && isBusinessDayScaleActive(ctx.xAxisOptions)) {
      const { displayX, mapping } = applyBusinessDayX(data.x, ctx.xAxisOptions);
      ctx.timeScaleMapping = mapping;
      patch = { ...data, x: displayX };
    }
    s.updateData(patch);
    updateSeriesBuffer(ctx, s);
    ctx.requestRender();
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

  if (ctx.autoScrollEnabled) {
    const newBounds = s.getBounds();
    if (newBounds) {
      const xRange = ctx.viewBounds.xMax - ctx.viewBounds.xMin;
      if (oldMaxX >= ctx.viewBounds.xMax - xRange * 0.05) {
        ctx.viewBounds.xMax = newBounds.xMax;
        ctx.viewBounds.xMin = ctx.viewBounds.xMax - xRange;
      }
    }
    if (Array.from(ctx.yAxisOptionsMap.values()).some((o: any) => o.auto)) {
      ctx.autoScaleYOnly();
    }
  } else {
    // During streaming (not autoscroll), only auto-scale Y to prevent X-axis shift
    if (Array.from(ctx.yAxisOptionsMap.values()).some((o: any) => o.auto)) {
      ctx.autoScaleYOnly();
    }
    // Only auto-scale X if explicitly enabled and data bounds changed significantly
    if (ctx.xAxisOptions.auto) {
      const newBounds = s.getBounds();
      if (newBounds) {
        const currentXRange = ctx.viewBounds.xMax - ctx.viewBounds.xMin;
        const dataXRange = newBounds.xMax - newBounds.xMin;
        // Only update X-axis if data extends significantly beyond current view
        if (newBounds.xMax > ctx.viewBounds.xMax || 
            newBounds.xMin < ctx.viewBounds.xMin ||
            Math.abs(dataXRange - currentXRange) / currentXRange > 0.1) {
          const xPad = Math.min(dataXRange * 0.005, 1e10);
          ctx.viewBounds.xMin = Math.max(-1e15, newBounds.xMin - xPad);
          ctx.viewBounds.xMax = Math.min(1e15, newBounds.xMax + xPad);
        }
      }
    }
  }
  ctx.requestRender();
}

export function setMaxPoints(ctx: any, id: string, maxPoints: number): void {
  const s = ctx.series.get(id);
  if (s) {
    s.setMaxPoints(maxPoints);
    ctx.requestRender();
  }
}
