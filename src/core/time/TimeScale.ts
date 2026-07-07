/**
 * TimeScale — business-day / session-aware X mapping for trading charts.
 * Stage 2.1–2.3
 */

export type TimeScaleCalendar = "continuous" | "business-day";
export type MarketSession = "24x7" | "NYSE";

export interface TimeScaleOptions {
  calendar?: TimeScaleCalendar;
  session?: MarketSession;
  /** IANA timezone (reserved for future session-hour filtering) */
  timezone?: string;
}

export interface BusinessDayMapping {
  /** X values for chart (consecutive indices on business days) */
  scaledX: Float64Array;
  /** Original timestamp per scaled index (for tooltips / ticks) */
  timeByIndex: Float64Array;
  /** Original index → scaled index (-1 if skipped) */
  sourceToScaled: Int32Array;
}

const MS_DAY = 86_400_000;

/** UTC day-of-week: 0 = Sunday, 6 = Saturday */
function dayOfWeekUtc(ts: number): number {
  return new Date(ts).getUTCDay();
}

/** Weekend check (NYSE calendar MVP — UTC weekends). */
export function isBusinessDay(ts: number, _opts: TimeScaleOptions = {}): boolean {
  const dow = dayOfWeekUtc(ts);
  return dow !== 0 && dow !== 6;
}

/**
 * Map timestamp series to consecutive business-day indices (skips Sat/Sun bars).
 * NaN in scaledX marks non-business bars (hidden gap).
 */
export function mapToBusinessDayScale(
  times: Float32Array | Float64Array,
  opts: TimeScaleOptions = {},
): BusinessDayMapping {
  const calendar = opts.calendar ?? "business-day";
  const n = times.length;
  const scaledX = new Float64Array(n);
  const sourceToScaled = new Int32Array(n);
  sourceToScaled.fill(-1);

  if (calendar === "continuous") {
    for (let i = 0; i < n; i++) {
      scaledX[i] = times[i];
      sourceToScaled[i] = i;
    }
    return {
      scaledX,
      timeByIndex: times instanceof Float64Array ? times : Float64Array.from(times),
      sourceToScaled,
    };
  }

  const timeByIndex: number[] = [];
  let logical = 0;
  for (let i = 0; i < n; i++) {
    const t = times[i];
    if (!Number.isFinite(t) || !isBusinessDay(t, opts)) {
      scaledX[i] = Number.NaN;
      continue;
    }
    scaledX[i] = logical;
    timeByIndex[logical] = t;
    sourceToScaled[i] = logical;
    logical++;
  }

  return {
    scaledX,
    timeByIndex: Float64Array.from(timeByIndex),
    sourceToScaled,
  };
}

/** Resolve timestamp at a scaled business-day index (for axis ticks). */
export function timeAtBusinessIndex(mapping: BusinessDayMapping, index: number): number | undefined {
  return mapping.timeByIndex[index];
}

/** Visible span in ms using business-day mapping. */
export function businessDaySpanMs(mapping: BusinessDayMapping, xMin: number, xMax: number): number {
  const i0 = Math.max(0, Math.floor(xMin));
  const i1 = Math.min(mapping.timeByIndex.length - 1, Math.ceil(xMax));
  const t0 = mapping.timeByIndex[i0];
  const t1 = mapping.timeByIndex[i1];
  if (t0 == null || t1 == null) return MS_DAY;
  return Math.abs(t1 - t0) || MS_DAY;
}
