/**
 * Registry for series option preprocessors (heikin-ashi, business-day, indicators).
 */
import type { HeatmapOptions, SeriesOptions } from "../../../types";

export type SeriesOptionsPreprocessor = (
  ctx: unknown,
  options: SeriesOptions | HeatmapOptions,
) => SeriesOptions | HeatmapOptions;

export type SeriesOptionsExpander = (
  options: SeriesOptions | HeatmapOptions,
) => Array<SeriesOptions | HeatmapOptions>;

const preprocessors: SeriesOptionsPreprocessor[] = [];
let expander: SeriesOptionsExpander | null = null;

export function registerSeriesOptionsPreprocessor(
  fn: SeriesOptionsPreprocessor,
): void {
  preprocessors.push(fn);
}

export function registerSeriesOptionsExpander(fn: SeriesOptionsExpander): void {
  expander = fn;
}

export function applySeriesOptionsPreprocessors(
  ctx: unknown,
  options: SeriesOptions | HeatmapOptions,
): SeriesOptions | HeatmapOptions {
  let result = options;
  for (const fn of preprocessors) {
    result = fn(ctx, result);
  }
  return result;
}

export function expandSeriesOptions(
  options: SeriesOptions | HeatmapOptions,
): Array<SeriesOptions | HeatmapOptions> {
  if (expander) {
    return expander(options);
  }
  return [options];
}
