/** Shared synthetic data for E2E scenarios */

export function lineData(n = 60) {
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = i;
    y[i] = Math.sin(i * 0.15) * 12 + 50;
  }
  return { x, y };
}

export function ohlcData(n = 80) {
  const x = new Float32Array(n);
  const open = new Float32Array(n);
  const high = new Float32Array(n);
  const low = new Float32Array(n);
  const close = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = Date.UTC(2024, 0, 8) + i * 86_400_000;
    open[i] = 100 + (i % 12);
    high[i] = open[i] + 4;
    low[i] = open[i] - 3;
    close[i] = open[i] + (i % 2 ? 2 : -1);
  }
  return { x, open, high, low, close, y: close };
}

export function boxplotData(n = 20) {
  const x = new Float32Array(n);
  const low = new Float32Array(n);
  const open = new Float32Array(n);
  const median = new Float32Array(n);
  const close = new Float32Array(n);
  const high = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = i;
    low[i] = 90 + i;
    open[i] = 100 + i;
    median[i] = 102 + i;
    close[i] = 101 + i;
    high[i] = 108 + i;
  }
  return { x, low, open, median, close, high };
}

export function waterfallData(n = 8) {
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = i;
    y[i] = i % 2 === 0 ? 5 : -3;
  }
  return { x, y };
}

export function heatmapData() {
  const rows = 8;
  const cols = 12;
  const x = new Float32Array(rows * cols);
  const y = new Float32Array(rows * cols);
  const z = new Float32Array(rows * cols);
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      x[k] = c;
      y[k] = r;
      z[k] = Math.sin(r * 0.5) * Math.cos(c * 0.4);
      k++;
    }
  }
  return { x, y, z, rows, cols };
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function hostEl() {
  const el = document.getElementById("host");
  if (!el) throw new Error("#host missing");
  return el;
}
