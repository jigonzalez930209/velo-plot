/**
 * Truncate series data for replay-style SVG export (`exportSVG({ at })`).
 */
import { Series } from "../../../Series";
import type { SeriesData } from "../../../../types";

function findEndIndex(x: ArrayLike<number>, at: number): number {
  let end = x.length;
  for (let i = 0; i < x.length; i++) {
    if (x[i] > at) {
      end = Math.max(1, i);
      break;
    }
  }
  return end;
}

function sliceField(
  arr: Float32Array | Float64Array | undefined,
  end: number,
): Float32Array | Float64Array | undefined {
  if (!arr) return undefined;
  return Float32Array.from(arr.subarray(0, end));
}

function sliceSeriesData(data: SeriesData, end: number): SeriesData {
  return {
    x: Float32Array.from(data.x.subarray(0, end)),
    y: data.y ? Float32Array.from(data.y.subarray(0, end)) : new Float32Array(0),
    yError: sliceField(data.yError, end),
    yErrorPlus: sliceField(data.yErrorPlus, end),
    yErrorMinus: sliceField(data.yErrorMinus, end),
    xError: sliceField(data.xError, end),
    xErrorPlus: sliceField(data.xErrorPlus, end),
    xErrorMinus: sliceField(data.xErrorMinus, end),
    y2: sliceField(data.y2, end),
    open: sliceField(data.open, end),
    high: sliceField(data.high, end),
    low: sliceField(data.low, end),
    close: sliceField(data.close, end),
  };
}

/** Return series truncated to points with x ≤ `at` (data units). */
export function filterSeriesAtTimestamp(series: Series[], at: number): Series[] {
  return series.map((s) => {
    const data = s.getData();
    if (!data.x?.length) return s;

    const end = findEndIndex(data.x, at);
    if (end >= data.x.length) return s;

    return new Series({
      id: s.getId(),
      type: s.getType(),
      name: s.getName(),
      yAxisId: s.getYAxisId(),
      style: s.getStyle(),
      visible: s.isVisible(),
      data: sliceSeriesData(data, end),
      markers: s.getMarkers(),
    });
  });
}
