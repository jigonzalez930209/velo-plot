/**
 * Series Buffer Management and Stacking Logic
 */
import { Series } from "../../Series";
import { getSeriesBufferHandler } from "./seriesTypeRegistry";
import { refreshStackLite, updateSeriesBufferLite } from "./SeriesBufferLite";

const LITE_TYPES = new Set([
  "line",
  "scatter",
  "line+scatter",
  "step",
  "step+scatter",
  "band",
  "area",
]);

export function updateSeriesBuffer(ctx: any, s: Series): void {
  if (!ctx.renderer) return;

  const stackId = s.getStackId();
  if (stackId) {
    refreshStack(ctx, stackId);
    return;
  }

  const seriesType = s.getType();
  if (
    seriesType !== "heatmap" &&
    seriesType !== "polar" &&
    (!s.getData() || s.getData().x.length === 0)
  ) {
    return;
  }

  const handler = getSeriesBufferHandler(seriesType);
  if (handler) {
    handler(ctx, s);
    return;
  }

  if (LITE_TYPES.has(seriesType)) {
    updateSeriesBufferLite(ctx, s);
    return;
  }

  throw new Error(
    `[VeloPlot] Series type "${seriesType}" requires an extended bundle. ` +
      `Import from 'velo-plot/trading', 'velo-plot/scientific', or 'velo-plot/full'.`,
  );
}

export function refreshStack(ctx: any, stackId: string): void {
  refreshStackLite(ctx, stackId);
}
