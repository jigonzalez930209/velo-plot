/**
 * Expands a composite indicator definition into native series (bar, line, band, scatter).
 */
import type { SeriesOptions } from "../../types";
import type { IndicatorSeriesOptions, IndicatorStyle, IndicatorLineLayer } from "./types";

function toF32(data: Float32Array | Float64Array | number[]): Float32Array | Float64Array {
  if (data instanceof Float32Array || data instanceof Float64Array) return data;
  return Float32Array.from(data);
}

function splitSignedHistogram(
  hist: Float32Array | Float64Array,
): { positive: Float32Array; negative: Float32Array } {
  const positive = new Float32Array(hist.length);
  const negative = new Float32Array(hist.length);
  for (let i = 0; i < hist.length; i++) {
    const v = hist[i];
    positive[i] = v > 0 ? v : 0;
    negative[i] = v < 0 ? v : 0;
  }
  return { positive, negative };
}

interface ColorSegment {
  points: { x: number; y: number }[];
  color: string;
}

function resolveLineRefY(
  ref: number | "zero" | string | undefined,
  index: number,
  lines: IndicatorLineLayer[],
): number {
  if (ref === undefined || ref === "zero") return 0;
  if (typeof ref === "number") return ref;
  const other = lines.find((l) => l.id === ref);
  if (!other) return 0;
  const yRef = toF32(other.y);
  return yRef[index] ?? 0;
}

function splitLineIntoColorSegments(
  x: Float32Array | Float64Array,
  y: Float32Array | Float64Array,
  refAt: (i: number) => number,
  aboveColor: string,
  belowColor: string,
): ColorSegment[] {
  const n = x.length;
  if (n === 0) return [];
  if (n === 1) {
    const color = y[0] >= refAt(0) ? aboveColor : belowColor;
    return [{ points: [{ x: x[0], y: y[0] }], color }];
  }

  const segments: ColorSegment[] = [];
  let current: ColorSegment | null = null;

  const colorAt = (i: number) => (y[i] >= refAt(i) ? aboveColor : belowColor);

  const addPoint = (px: number, py: number, color: string) => {
    if (!current || current.color !== color) {
      if (current?.points.length) segments.push(current);
      current = { points: [{ x: px, y: py }], color };
    } else {
      current.points.push({ x: px, y: py });
    }
  };

  const flush = () => {
    if (current?.points.length) {
      segments.push(current);
      current = null;
    }
  };

  addPoint(x[0], y[0], colorAt(0));

  for (let i = 1; i < n; i++) {
    const y0 = y[i - 1];
    const y1 = y[i];
    const r0 = refAt(i - 1);
    const r1 = refAt(i);
    const above0 = y0 >= r0;
    const above1 = y1 >= r1;

    if (above0 === above1) {
      addPoint(x[i], y[i], colorAt(i));
      continue;
    }

    const denom = y1 - y0 - (r1 - r0);
    let t = denom !== 0 ? (r0 - y0) / denom : 0.5;
    t = Math.max(0, Math.min(1, t));
    const xc = x[i - 1] + t * (x[i] - x[i - 1]);
    const yc = y0 + t * (y1 - y0);
    const colorBefore = above0 ? aboveColor : belowColor;
    const colorAfter = above1 ? aboveColor : belowColor;

    addPoint(xc, yc, colorBefore);
    flush();
    addPoint(xc, yc, colorAfter);
    addPoint(x[i], y[i], colorAt(i));
  }

  flush();
  return segments;
}

function pushColoredLineSeries(
  out: SeriesOptions[],
  lineId: string,
  x: Float32Array | Float64Array,
  y: Float32Array | Float64Array,
  line: IndicatorLineLayer,
  lines: IndicatorLineLayer[],
  visible: boolean,
  segmentKey: string,
): void {
  const zones = line.colorZones;
  if (!zones) return;

  const refAt = (i: number) => resolveLineRefY(zones.ref, i, lines);
  const segments = splitLineIntoColorSegments(
    x,
    y,
    refAt,
    zones.aboveColor,
    zones.belowColor,
  );

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    if (seg.points.length < 2) continue;
    out.push({
      id: `${lineId}-${segmentKey}-${si}`,
      type: "line",
      visible,
      data: {
        x: Float32Array.from(seg.points.map((p) => p.x)),
        y: Float32Array.from(seg.points.map((p) => p.y)),
      },
      style: {
        color: seg.color,
        width: line.width ?? 2,
        opacity: line.opacity ?? 1,
      },
    });
  }
}

const DEFAULT_STYLE: Required<
  Pick<
    IndicatorStyle,
    | "baselineColor"
    | "baselineWidth"
    | "baselineDash"
    | "peakColor"
    | "troughColor"
    | "peakSize"
    | "troughSize"
  >
> = {
  baselineColor: "rgba(255,255,255,0.35)",
  baselineWidth: 1,
  baselineDash: [4, 4],
  peakColor: "#ff00ff",
  troughColor: "#00ffff",
  peakSize: 6,
  troughSize: 6,
};

/**
 * Build native series options from an indicator definition.
 * Use in any chart pane — standalone or inside createStackedChart.
 */
export function buildIndicatorSeries(options: IndicatorSeriesOptions): SeriesOptions[] {
  const { id, data, style = {}, visible = true } = options;
  const merged = { ...DEFAULT_STYLE, ...style };
  const x = toF32(data.x);
  const n = x.length;
  const out: SeriesOptions[] = [];

  if (data.fills?.length) {
    for (let i = 0; i < data.fills.length; i++) {
      const fill = data.fills[i];
      const fillId = fill.id ?? `${id}-fill-${i}`;
      out.push({
        id: fillId,
        type: "band",
        visible,
        data: {
          x,
          y: toF32(fill.upper),
          y2: toF32(fill.lower),
        },
        style: {
          color: fill.color ?? "rgba(100, 80, 180, 0.25)",
          opacity: fill.opacity ?? 0.35,
        },
      });
    }
  }

  if (data.histogram) {
    const hist = toF32(data.histogram.y);
    const { positive, negative } = splitSignedHistogram(hist);
    const barWidth = data.histogram.barWidth;
    const barStyle = barWidth !== undefined ? { barWidth } : {};

    out.push({
      id: `${id}-hist-pos`,
      type: "bar",
      visible,
      data: { x, y: positive },
      style: {
        color: data.histogram.positiveColor ?? "#26a69a",
        opacity: data.histogram.opacity ?? 0.85,
        ...barStyle,
      } as SeriesOptions["style"],
    });
    out.push({
      id: `${id}-hist-neg`,
      type: "bar",
      visible,
      data: { x, y: negative },
      style: {
        color: data.histogram.negativeColor ?? "#ef5350",
        opacity: data.histogram.opacity ?? 0.85,
        ...barStyle,
      } as SeriesOptions["style"],
    });
  }

  if (data.lines?.length) {
    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i];
      const lineId = line.id ?? `${id}-line-${i}`;
      const yData = toF32(line.y);

      if (line.colorZones) {
        pushColoredLineSeries(out, lineId, x, yData, line, data.lines, visible, "zone");
        continue;
      }

      out.push({
        id: lineId,
        type: "line",
        visible,
        data: { x, y: yData },
        style: {
          color: line.color ?? (i === 0 ? "#00e5ff" : "#e040fb"),
          width: line.width ?? 2,
          opacity: line.opacity ?? 1,
        },
      });
    }
  }

  if (data.baseline !== undefined && n >= 2) {
    const baseline = data.baseline;
    out.push({
      id: `${id}-baseline`,
      type: "line",
      visible,
      data: {
        x: Float32Array.from([x[0], x[n - 1]]),
        y: Float32Array.from([baseline, baseline]),
      },
      style: {
        color: merged.baselineColor,
        width: merged.baselineWidth,
        lineDash: merged.baselineDash,
        opacity: 1,
      },
    });
  }

  if (data.referenceLines?.length) {
    for (let i = 0; i < data.referenceLines.length; i++) {
      const ref = data.referenceLines[i];
      out.push({
        id: `${id}-ref-${i}`,
        type: "line",
        visible,
        data: {
          x: Float32Array.from([x[0], x[n - 1]]),
          y: Float32Array.from([ref.y, ref.y]),
        },
        style: {
          color: ref.color ?? "rgba(255,255,255,0.2)",
          width: ref.width ?? 1,
          lineDash: ref.dash ?? [2, 4],
          opacity: 0.8,
        },
      });
    }
  }

  if (data.markers?.length) {
    const peaks = data.markers.filter((m) => m.kind === "peak");
    const troughs = data.markers.filter((m) => m.kind === "trough");

    if (peaks.length) {
      out.push({
        id: `${id}-peaks`,
        type: "scatter",
        visible,
        data: {
          x: Float32Array.from(peaks.map((m) => m.x)),
          y: Float32Array.from(peaks.map((m) => m.y)),
        },
        style: {
          color: merged.peakColor,
          pointSize: merged.peakSize,
          opacity: 1,
        },
      });
    }
    if (troughs.length) {
      out.push({
        id: `${id}-troughs`,
        type: "scatter",
        visible,
        data: {
          x: Float32Array.from(troughs.map((m) => m.x)),
          y: Float32Array.from(troughs.map((m) => m.y)),
        },
        style: {
          color: merged.troughColor,
          pointSize: merged.troughSize,
          opacity: 1,
        },
      });
    }
  }

  return out;
}

/** Convenience: one call returns all series for chart.addSeries / stacked pane config. */
export function createIndicatorSeries(options: IndicatorSeriesOptions): SeriesOptions[] {
  return buildIndicatorSeries(options);
}

/**
 * Detect local extrema on a line for peak/trough markers.
 */
export function detectIndicatorMarkers(
  x: Float32Array | Float64Array | number[],
  y: Float32Array | Float64Array | number[],
  window = 3,
): import("./types").IndicatorMarker[] {
  const xArr = toF32(x);
  const yArr = toF32(y);
  const markers: import("./types").IndicatorMarker[] = [];
  const w = Math.max(1, window);

  for (let i = w; i < yArr.length - w; i++) {
    let isPeak = true;
    let isTrough = true;
    for (let j = i - w; j <= i + w; j++) {
      if (j === i) continue;
      if (yArr[j] >= yArr[i]) isPeak = false;
      if (yArr[j] <= yArr[i]) isTrough = false;
    }
    if (isPeak) markers.push({ x: xArr[i], y: yArr[i], kind: "peak" });
    else if (isTrough) markers.push({ x: xArr[i], y: yArr[i], kind: "trough" });
  }
  return markers;
}
