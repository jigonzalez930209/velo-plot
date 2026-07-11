/**
 * Tick generation utilities shared with OverlayRenderer logic.
 */

import type { Scale } from "../../../../scales";
import type { BusinessDayMapping } from "../../../time/TimeScale";

export function generateMinorTicks(majorTicks: number[], divisions: number): number[] {
  if (majorTicks.length < 2 || divisions < 2) return [];
  const minor: number[] = [];
  for (let i = 0; i < majorTicks.length - 1; i++) {
    const step = (majorTicks[i + 1] - majorTicks[i]) / divisions;
    for (let j = 1; j < divisions; j++) {
      minor.push(majorTicks[i] + step * j);
    }
  }
  return minor;
}

export function filterBusinessDayXTicks(
  ticks: number[],
  mapping: BusinessDayMapping | null | undefined,
): number[] {
  if (!mapping) return ticks;
  const maxIdx = mapping.timeByIndex.length - 1;
  if (maxIdx < 0) return [];
  const seen = new Set<number>();
  const result: number[] = [];
  for (const tick of ticks) {
    const idx = Math.round(tick);
    if (idx >= 0 && idx <= maxIdx && !seen.has(idx)) {
      seen.add(idx);
      result.push(idx);
    }
  }
  return result;
}

export function resolveXTicks(
  xScale: Scale,
  tickCount: number,
  mapping?: BusinessDayMapping | null,
): number[] {
  return filterBusinessDayXTicks(xScale.ticks(tickCount), mapping);
}

export function resolveGridXTicks(xScale: Scale, tickCount: number): number[] {
  return xScale.ticks(tickCount);
}

export function primaryYScale(
  yAxes: Map<string, Scale>,
  primaryYAxisId?: string,
): Scale | undefined {
  if (primaryYAxisId && yAxes.has(primaryYAxisId)) {
    return yAxes.get(primaryYAxisId);
  }
  return yAxes.get("default") ?? yAxes.values().next().value;
}

export function resolveYScale(
  yAxes: Map<string, Scale>,
  yAxisId: string | undefined,
  primaryYAxisId?: string,
): Scale | undefined {
  if (yAxisId && yAxes.has(yAxisId)) return yAxes.get(yAxisId);
  return primaryYScale(yAxes, primaryYAxisId);
}
