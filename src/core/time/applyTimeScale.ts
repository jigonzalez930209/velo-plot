/**
 * Wire TimeScale into chart series + axis formatting (Stage 2.2–2.3).
 */

import type { AxisOptions } from "../../types";
import { formatTimeTick } from "../format/axisFormat";
import {
  businessDaySpanMs,
  mapToBusinessDayScale,
  timeAtBusinessIndex,
  type BusinessDayMapping,
  type TimeScaleOptions,
} from "./TimeScale";

export function isBusinessDayScaleActive(xAxis: AxisOptions): boolean {
  return (
    xAxis.type === "time" &&
    (xAxis.timeScale?.calendar ?? "business-day") !== "continuous"
  );
}

export function resolveTimeScaleOpts(xAxis: AxisOptions): TimeScaleOptions {
  return {
    calendar: "business-day",
    session: "24x7",
    ...xAxis.timeScale,
  };
}

export function applyBusinessDayX(
  x: Float32Array | Float64Array,
  xAxis: AxisOptions,
): { displayX: Float64Array; mapping: BusinessDayMapping } {
  const mapping = mapToBusinessDayScale(x, resolveTimeScaleOpts(xAxis));
  return { displayX: mapping.scaledX, mapping };
}

export function formatBusinessDayTick(
  logicalIndex: number,
  mapping: BusinessDayMapping,
): string | null {
  const idx = Math.round(logicalIndex);
  const t = timeAtBusinessIndex(mapping, idx);
  if (t === undefined) return null;
  const span = businessDaySpanMs(mapping, idx - 1, idx + 1);
  return formatTimeTick(t, span);
}
