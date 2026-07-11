import type { Series } from "../../../Series";

export function seriesId(series: Series, fallback = "series"): string {
  if (typeof series.getId === "function") return series.getId();
  return fallback;
}
