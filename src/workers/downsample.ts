/**
 * LTTB (Largest-Triangle-Three-Buckets) Downsampling Algorithm
 *
 * This algorithm downsamples time-series data while preserving visual features.
 * It's much better than naive sampling for preserving peaks and valleys.
 *
 * Reference: https://skemman.is/bitstream/1946/15343/3/SS_MSthesis.pdf
 */

export interface DownsampleResult {
  x: Float32Array;
  y: Float32Array;
  /** Original indices of selected points */
  indices: Uint32Array;
}

/**
 * Downsample data using LTTB algorithm
 *
 * @param x - X values (e.g., potential)
 * @param y - Y values (e.g., current)
 * @param targetPoints - Number of output points
 * @returns Downsampled data
 */
export function lttbDownsample(
  x: Float32Array | Float64Array,
  y: Float32Array | Float64Array,
  targetPoints: number
): DownsampleResult {
  const length = x.length;

  // No need to downsample
  if (targetPoints >= length || targetPoints <= 2) {
    return {
      x: new Float32Array(x),
      y: new Float32Array(y),
      indices: new Uint32Array(Array.from({ length }, (_, i) => i)),
    };
  }

  const outX = new Float32Array(targetPoints);
  const outY = new Float32Array(targetPoints);
  const outIndices = new Uint32Array(targetPoints);

  // Always include first point
  outX[0] = x[0];
  outY[0] = y[0];
  outIndices[0] = 0;

  // Bucket size
  const bucketSize = (length - 2) / (targetPoints - 2);

  let a = 0; // Previous selected point index
  let outIdx = 1;

  for (let i = 0; i < targetPoints - 2; i++) {
    // Calculate bucket boundaries
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const bucketEnd = Math.floor((i + 2) * bucketSize) + 1;

    // Calculate average point of next bucket
    const nextBucketStart = Math.min(bucketEnd, length - 1);
    const nextBucketEnd = Math.min(
      Math.floor((i + 3) * bucketSize) + 1,
      length
    );

    let avgX = 0;
    let avgY = 0;
    let avgCount = 0;

    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      avgX += x[j];
      avgY += y[j];
      avgCount++;
    }

    if (avgCount > 0) {
      avgX /= avgCount;
      avgY /= avgCount;
    }

    // Find point in current bucket with largest triangle area
    let maxArea = -1;
    let maxIndex = bucketStart;

    const aX = x[a];
    const aY = y[a];

    for (let j = bucketStart; j < bucketEnd && j < length; j++) {
      // Calculate triangle area (simplified: |x1(y2-y3) + x2(y3-y1) + x3(y1-y2)| / 2)
      const area = Math.abs(
        (aX - avgX) * (y[j] - aY) - (aX - x[j]) * (avgY - aY)
      );

      if (area > maxArea) {
        maxArea = area;
        maxIndex = j;
      }
    }

    // Store selected point
    outX[outIdx] = x[maxIndex];
    outY[outIdx] = y[maxIndex];
    outIndices[outIdx] = maxIndex;

    a = maxIndex;
    outIdx++;
  }

  // Always include last point
  outX[targetPoints - 1] = x[length - 1];
  outY[targetPoints - 1] = y[length - 1];
  outIndices[targetPoints - 1] = length - 1;

  return { x: outX, y: outY, indices: outIndices };
}

/**
 * Min-Max per bucket downsampling
 *
 * Simpler alternative to LTTB that preserves extremes in each bucket.
 * Uses 2 points per bucket (min and max), so output is ~2x target.
 */
export function minMaxDownsample(
  x: Float32Array | Float64Array,
  y: Float32Array | Float64Array,
  bucketCount: number
): DownsampleResult {
  const length = x.length;

  if (bucketCount >= length / 2) {
    return {
      x: new Float32Array(x),
      y: new Float32Array(y),
      indices: new Uint32Array(Array.from({ length }, (_, i) => i)),
    };
  }

  const bucketSize = length / bucketCount;
  const outX: number[] = [];
  const outY: number[] = [];
  const outIndices: number[] = [];

  for (let b = 0; b < bucketCount; b++) {
    const start = Math.floor(b * bucketSize);
    const end = Math.floor((b + 1) * bucketSize);

    let minY = Infinity;
    let maxY = -Infinity;
    let minIdx = start;
    let maxIdx = start;

    for (let i = start; i < end && i < length; i++) {
      if (y[i] < minY) {
        minY = y[i];
        minIdx = i;
      }
      if (y[i] > maxY) {
        maxY = y[i];
        maxIdx = i;
      }
    }

    // Add points in order (min first if it comes before max)
    if (minIdx <= maxIdx) {
      outX.push(x[minIdx], x[maxIdx]);
      outY.push(y[minIdx], y[maxIdx]);
      outIndices.push(minIdx, maxIdx);
    } else {
      outX.push(x[maxIdx], x[minIdx]);
      outY.push(y[maxIdx], y[minIdx]);
      outIndices.push(maxIdx, minIdx);
    }
  }

  return {
    x: new Float32Array(outX),
    y: new Float32Array(outY),
    indices: new Uint32Array(outIndices),
  };
}

/**
 * Calculate optimal target points based on canvas width
 */
export function calculateTargetPoints(
  dataLength: number,
  canvasWidth: number,
  pointsPerPixel = 2
): number {
  // Never draw more than pointsPerPixel per pixel
  const maxPoints = canvasWidth * pointsPerPixel;
  return Math.min(dataLength, maxPoints);
}

export interface OhlcDownsampleResult {
  x: Float32Array;
  open: Float32Array;
  high: Float32Array;
  low: Float32Array;
  close: Float32Array;
  indices: Uint32Array;
}

/**
 * Aggregate OHLC bars into fewer buckets while preserving extremes.
 * Each bucket: open=first open, close=last close, high=max high, low=min low, x=last x.
 */
export function ohlcMinMaxDownsample(
  x: Float32Array | Float64Array,
  open: Float32Array | Float64Array,
  high: Float32Array | Float64Array,
  low: Float32Array | Float64Array,
  close: Float32Array | Float64Array,
  targetBars: number,
): OhlcDownsampleResult {
  const length = x.length;
  if (targetBars >= length || targetBars <= 1 || length === 0) {
    return {
      x: new Float32Array(x),
      open: new Float32Array(open),
      high: new Float32Array(high),
      low: new Float32Array(low),
      close: new Float32Array(close),
      indices: new Uint32Array(Array.from({ length }, (_, i) => i)),
    };
  }

  const bucketSize = length / targetBars;
  const outX: number[] = [];
  const outOpen: number[] = [];
  const outHigh: number[] = [];
  const outLow: number[] = [];
  const outClose: number[] = [];
  const outIndices: number[] = [];

  for (let b = 0; b < targetBars; b++) {
    const start = Math.floor(b * bucketSize);
    const end = Math.min(length, Math.floor((b + 1) * bucketSize));
    if (start >= end) continue;

    let hi = -Infinity;
    let lo = Infinity;
    let lastIdx = start;

    for (let i = start; i < end; i++) {
      if (high[i] > hi) hi = high[i];
      if (low[i] < lo) lo = low[i];
      lastIdx = i;
    }

    outOpen.push(open[start]);
    outHigh.push(hi);
    outLow.push(lo);
    outClose.push(close[lastIdx]);
    outX.push(x[lastIdx]);
    outIndices.push(lastIdx);
  }

  return {
    x: new Float32Array(outX),
    open: new Float32Array(outOpen),
    high: new Float32Array(outHigh),
    low: new Float32Array(outLow),
    close: new Float32Array(outClose),
    indices: new Uint32Array(outIndices),
  };
}

/** Binary search lower bound: first index where x[i] >= value */
export function lowerBoundX(
  x: Float32Array | Float64Array,
  value: number,
): number {
  let lo = 0;
  let hi = x.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (x[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Binary search upper bound: first index where x[i] > value */
export function upperBoundX(
  x: Float32Array | Float64Array,
  value: number,
): number {
  let lo = 0;
  let hi = x.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (x[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export interface ViewportSlice {
  x: Float32Array;
  y?: Float32Array;
  open?: Float32Array;
  high?: Float32Array;
  low?: Float32Array;
  close?: Float32Array;
  start: number;
  end: number;
}

/**
 * Slice sorted x-series to visible range plus buffer (fraction of visible width).
 */
export function sliceSeriesToViewport(
  source: {
    x: Float32Array | Float64Array;
    y?: Float32Array | Float64Array;
    open?: Float32Array | Float64Array;
    high?: Float32Array | Float64Array;
    low?: Float32Array | Float64Array;
    close?: Float32Array | Float64Array;
  },
  xMin: number,
  xMax: number,
  bufferRatio = 0.5,
): ViewportSlice {
  const length = source.x.length;
  if (length === 0) {
    return { x: new Float32Array(0), start: 0, end: 0 };
  }

  const range = Math.max(xMax - xMin, 1e-12);
  const paddedMin = xMin - range * bufferRatio;
  const paddedMax = xMax + range * bufferRatio;

  let start = lowerBoundX(source.x, paddedMin);
  let end = upperBoundX(source.x, paddedMax);
  start = Math.max(0, start);
  end = Math.min(length, Math.max(end, start + 1));

  const slice = <T extends Float32Array | Float64Array>(arr: T | undefined): Float32Array | undefined => {
    if (!arr) return undefined;
    return new Float32Array(arr.subarray(start, end));
  };

  return {
    x: new Float32Array(source.x.subarray(start, end)),
    y: slice(source.y),
    open: slice(source.open),
    high: slice(source.high),
    low: slice(source.low),
    close: slice(source.close),
    start,
    end,
  };
}
