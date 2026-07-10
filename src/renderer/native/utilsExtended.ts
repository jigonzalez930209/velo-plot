export function interleaveBoxPlotData(
  x: Float32Array | Float64Array | number[],
  min: Float32Array | Float64Array | number[],
  q1: Float32Array | Float64Array | number[],
  median: Float32Array | Float64Array | number[],
  q3: Float32Array | Float64Array | number[],
  max: Float32Array | Float64Array | number[],
  width: number
): { lines: Float32Array; boxes: Float32Array } {
  const n = x.length;
  const w = width / 2;
  
  // Lines: 5 segments per box: 14 points per box if we use separate lines
  // Actually, let's use 10 points (5 lines x 2 points)
  const lineData = new Float32Array(n * 20);
  
  // Boxes: 1 rectangle (2 triangles) per box = 6 vertices * 2 floats = 12 floats per box
  const boxData = new Float32Array(n * 12);
  
  let lIdx = 0;
  let bIdx = 0;
  
  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const mi = min[i];
    const q1i = q1[i];
    const medi = median[i];
    const q3i = q3[i];
    const maxti = max[i];
    
    // Lines
    // 1. Lower whisker
    lineData[lIdx++] = xi; lineData[lIdx++] = mi;
    lineData[lIdx++] = xi; lineData[lIdx++] = q1i;
    // 2. Upper whisker
    lineData[lIdx++] = xi; lineData[lIdx++] = q3i;
    lineData[lIdx++] = xi; lineData[lIdx++] = maxti;
    // 3. Median
    lineData[lIdx++] = xi - w; lineData[lIdx++] = medi;
    lineData[lIdx++] = xi + w; lineData[lIdx++] = medi;
    // 4. Q1 bottom cap
    lineData[lIdx++] = xi - w; lineData[lIdx++] = q1i;
    lineData[lIdx++] = xi + w; lineData[lIdx++] = q1i;
    // 5. Q3 top cap
    lineData[lIdx++] = xi - w; lineData[lIdx++] = q3i;
    lineData[lIdx++] = xi + w; lineData[lIdx++] = q3i;
    
    // Rectangle (Box)
    boxData[bIdx++] = xi - w; boxData[bIdx++] = q1i;
    boxData[bIdx++] = xi + w; boxData[bIdx++] = q1i;
    boxData[bIdx++] = xi + w; boxData[bIdx++] = q3i;
    boxData[bIdx++] = xi - w; boxData[bIdx++] = q1i;
    boxData[bIdx++] = xi + w; boxData[bIdx++] = q3i;
    boxData[bIdx++] = xi - w; boxData[bIdx++] = q3i;
  }
  
  return { lines: lineData, boxes: boxData };
}

/**
 * Interleave data for Waterfall charts
 * Creates rectangles that show cumulative changes from a running total
 */
export function interleaveWaterfallData(
  x: Float32Array | Float64Array | number[],
  y: Float32Array | Float64Array | number[],
  width: number,
  isSubtotal?: boolean[]
): { 
  positiveData: Float32Array; 
  negativeData: Float32Array; 
  subtotalData: Float32Array;
  connectorData: Float32Array;
  positiveCount: number;
  negativeCount: number;
  subtotalCount: number;
} {
  const n = x.length;
  const w = width / 2;
  
  // Each bar is 2 triangles = 6 vertices
  const positiveData = new Float32Array(n * 12);
  const negativeData = new Float32Array(n * 12);
  const subtotalData = new Float32Array(n * 12);
  const connectorData = new Float32Array((n - 1) * 4); // Horizontal lines connecting bars
  
  let pIdx = 0, nIdx = 0, sIdx = 0, cIdx = 0;
  let runningTotal = 0;
  
  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    const isSub = isSubtotal?.[i] ?? false;
    
    let barBottom: number, barTop: number;
    
    if (isSub) {
      // Subtotal bar: from 0 to current running total
      barBottom = 0;
      barTop = runningTotal;
      
      // Draw subtotal bar
      subtotalData[sIdx++] = xi - w; subtotalData[sIdx++] = barBottom;
      subtotalData[sIdx++] = xi + w; subtotalData[sIdx++] = barBottom;
      subtotalData[sIdx++] = xi + w; subtotalData[sIdx++] = barTop;
      subtotalData[sIdx++] = xi - w; subtotalData[sIdx++] = barBottom;
      subtotalData[sIdx++] = xi + w; subtotalData[sIdx++] = barTop;
      subtotalData[sIdx++] = xi - w; subtotalData[sIdx++] = barTop;
    } else {
      // Regular bar: from running total to running total + value
      barBottom = runningTotal;
      barTop = runningTotal + yi;
      runningTotal = barTop;
      
      if (yi >= 0) {
        // Positive bar
        positiveData[pIdx++] = xi - w; positiveData[pIdx++] = barBottom;
        positiveData[pIdx++] = xi + w; positiveData[pIdx++] = barBottom;
        positiveData[pIdx++] = xi + w; positiveData[pIdx++] = barTop;
        positiveData[pIdx++] = xi - w; positiveData[pIdx++] = barBottom;
        positiveData[pIdx++] = xi + w; positiveData[pIdx++] = barTop;
        positiveData[pIdx++] = xi - w; positiveData[pIdx++] = barTop;
      } else {
        // Negative bar (barTop < barBottom)
        negativeData[nIdx++] = xi - w; negativeData[nIdx++] = barTop;
        negativeData[nIdx++] = xi + w; negativeData[nIdx++] = barTop;
        negativeData[nIdx++] = xi + w; negativeData[nIdx++] = barBottom;
        negativeData[nIdx++] = xi - w; negativeData[nIdx++] = barTop;
        negativeData[nIdx++] = xi + w; negativeData[nIdx++] = barBottom;
        negativeData[nIdx++] = xi - w; negativeData[nIdx++] = barBottom;
      }
    }
    
    // Connector line to next bar (if not last)
    if (i < n - 1) {
      const nextX = x[i + 1];
      connectorData[cIdx++] = xi + w;
      connectorData[cIdx++] = barTop;
      connectorData[cIdx++] = nextX - w;
      connectorData[cIdx++] = barTop;
    }
  }
  
  return {
    positiveData: positiveData.subarray(0, pIdx),
    negativeData: negativeData.subarray(0, nIdx),
    subtotalData: subtotalData.subarray(0, sIdx),
    connectorData: connectorData.subarray(0, cIdx),
    positiveCount: pIdx / 2,
    negativeCount: nIdx / 2,
    subtotalCount: sIdx / 2
  };
}
