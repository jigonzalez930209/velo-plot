/**
 * Registry for extended series buffer handlers (trading/scientific bundles).
 */
import type { Series } from "../../Series";

export type SeriesBufferHandler = (ctx: unknown, s: Series) => void;

const handlers = new Map<string, SeriesBufferHandler>();

export function registerSeriesBufferHandler(
  type: string,
  handler: SeriesBufferHandler,
): void {
  handlers.set(type, handler);
}

export function getSeriesBufferHandler(
  type: string,
): SeriesBufferHandler | undefined {
  return handlers.get(type);
}
