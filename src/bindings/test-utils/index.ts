/**
 * Shared test utilities for framework bindings.
 */

import { vi, expect } from "vitest";
import type { Chart } from "../../core/chart/types";
import type { Bounds } from "../../types";

export function createMockContainer(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "640px";
  el.style.height = "400px";
  document.body.appendChild(el);
  return el;
}

export function sampleLineData(n = 10): {
  x: Float32Array;
  y: Float32Array;
} {
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = i;
    y[i] = Math.sin(i * 0.5);
  }
  return { x, y };
}

export function sampleOhlcData(n = 10): {
  x: Float32Array;
  open: Float32Array;
  high: Float32Array;
  low: Float32Array;
  close: Float32Array;
} {
  const x = new Float32Array(n);
  const open = new Float32Array(n);
  const high = new Float32Array(n);
  const low = new Float32Array(n);
  const close = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = i;
    const base = 100 + i;
    open[i] = base;
    high[i] = base + 2;
    low[i] = base - 2;
    close[i] = base + 1;
  }
  return { x, open, high, low, close };
}

export function buildMockChart(id = "chart-1"): Chart & {
  destroy: ReturnType<typeof vi.fn>;
  addSeries: ReturnType<typeof vi.fn>;
  updateSeries: ReturnType<typeof vi.fn>;
  removeSeries: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  zoom: ReturnType<typeof vi.fn>;
  resetZoom: ReturnType<typeof vi.fn>;
  autoScale: ReturnType<typeof vi.fn>;
  enableCursor: ReturnType<typeof vi.fn>;
  disableCursor: ReturnType<typeof vi.fn>;
  setTheme: ReturnType<typeof vi.fn>;
  updateXAxis: ReturnType<typeof vi.fn>;
  updateYAxis: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  getViewBounds: ReturnType<typeof vi.fn>;
  getAllSeries: ReturnType<typeof vi.fn>;
} {
  const bounds: Bounds = { xMin: 0, xMax: 10, yMin: -1, yMax: 1 };
  return {
    getId: () => id,
    addSeries: vi.fn(),
    updateSeries: vi.fn(),
    removeSeries: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    zoom: vi.fn(),
    resetZoom: vi.fn(),
    autoScale: vi.fn(),
    enableCursor: vi.fn(),
    disableCursor: vi.fn(),
    setTheme: vi.fn(),
    updateXAxis: vi.fn(),
    updateYAxis: vi.fn(),
    resize: vi.fn(),
    getViewBounds: vi.fn(() => bounds),
    getAllSeries: vi.fn(() => []),
    destroy: vi.fn(),
  } as unknown as Chart & {
    destroy: ReturnType<typeof vi.fn>;
    addSeries: ReturnType<typeof vi.fn>;
    updateSeries: ReturnType<typeof vi.fn>;
    removeSeries: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    zoom: ReturnType<typeof vi.fn>;
    resetZoom: ReturnType<typeof vi.fn>;
    autoScale: ReturnType<typeof vi.fn>;
    enableCursor: ReturnType<typeof vi.fn>;
    disableCursor: ReturnType<typeof vi.fn>;
    setTheme: ReturnType<typeof vi.fn>;
    updateXAxis: ReturnType<typeof vi.fn>;
    updateYAxis: ReturnType<typeof vi.fn>;
    resize: ReturnType<typeof vi.fn>;
    getViewBounds: ReturnType<typeof vi.fn>;
    getAllSeries: ReturnType<typeof vi.fn>;
  };
}

export function expectDestroyCalled(
  destroyFn: ReturnType<typeof vi.fn>,
): void {
  expect(destroyFn).toHaveBeenCalledTimes(1);
}
