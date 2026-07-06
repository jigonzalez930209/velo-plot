/**
 * Grid rendering benchmark — Canvas 2D vs WebGL spike comparison.
 * @module testing/gridSpikeBenchmark
 */

import { OverlayRenderer } from "../core/OverlayRenderer";
import { LinearScale } from "../scales";
import { DARK_THEME } from "../theme";
import { WebGLGridSpike, buildGridLineVertices, type GridLineSpec } from "../renderer/spike/WebGLGridSpike";
import { snapLineCoord } from "../core/render/pixelSnap";
import type { PlotArea } from "../types";

export interface GridBenchmarkResult {
  backend: "canvas2d" | "webgl";
  dpr: number;
  width: number;
  height: number;
  xTicks: number;
  yTicks: number;
  lineSegments: number;
  avgFrameUs: number;
  p95FrameUs: number;
  frames: number;
}

export interface GridCompareResult {
  canvas2d: GridBenchmarkResult;
  webgl: GridBenchmarkResult | null;
  /** Positive = WebGL faster */
  gainPercent: number;
  recommendation: "implement" | "defer";
}

function createMinimalMock2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const noop = () => {};
  return {
    canvas,
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 1,
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    fill: noop,
    clearRect: noop,
    setTransform: noop,
    setLineDash: noop,
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    fillText: noop,
    measureText: (text: string) => ({ width: text.length * 7 } as TextMetrics),
  } as unknown as CanvasRenderingContext2D;
}

function getCanvas2DContext(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext("2d") ?? createMinimalMock2D(canvas);
}

function makePlotArea(width: number, height: number): PlotArea {
  const margin = { top: 40, right: 40, bottom: 50, left: 60 };
  return {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };
}

function tickPixelLines(
  _plotArea: PlotArea,
  xScale: LinearScale,
  yScale: LinearScale,
  xTickCount: number,
  yTickCount: number,
): { xLines: number[]; yLines: number[] } {
  const xLines = xScale.ticks(xTickCount).map((t) => snapLineCoord(xScale.transform(t)));
  const yLines = yScale.ticks(yTickCount).map((t) => snapLineCoord(yScale.transform(t)));
  return { xLines, yLines };
}

function measureFrames(runFrame: () => void, frames: number): { avg: number; p95: number } {
  const samples: number[] = [];
  for (let i = 0; i < frames; i++) {
    const t0 = performance.now();
    runFrame();
    samples.push((performance.now() - t0) * 1000);
  }
  samples.sort((a, b) => a - b);
  const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
  const p95 = samples[Math.floor(samples.length * 0.95)] ?? avg;
  return { avg, p95 };
}

/** Benchmark Canvas 2D grid via OverlayRenderer.drawGrid */
export function benchmarkCanvasGrid(options: {
  width?: number;
  height?: number;
  dpr?: number;
  xTickCount?: number;
  yTickCount?: number;
  frames?: number;
  showMinor?: boolean;
} = {}): GridBenchmarkResult {
  const width = Math.round((options.width ?? 1920) * (options.dpr ?? 1));
  const height = Math.round((options.height ?? 1080) * (options.dpr ?? 1));
  const xTickCount = options.xTickCount ?? 24;
  const yTickCount = options.yTickCount ?? 16;
  const frames = options.frames ?? 120;

  const ctx = getCanvas2DContext(width, height);

  const theme = {
    ...DARK_THEME,
    grid: {
      ...DARK_THEME.grid,
      visible: true,
      showMinor: options.showMinor ?? true,
    },
  };

  const plotArea = makePlotArea(width, height);
  const xScale = new LinearScale();
  const yScale = new LinearScale();
  xScale.setDomain(0, 1_000_000);
  yScale.setDomain(-1, 1);
  xScale.setRange(plotArea.x, plotArea.x + plotArea.width);
  yScale.setRange(plotArea.y + plotArea.height, plotArea.y);

  const renderer = new OverlayRenderer(ctx, theme);

  const { avg, p95 } = measureFrames(() => {
    ctx.clearRect(0, 0, width, height);
    renderer.drawGrid(plotArea, xScale, yScale, { tickCount: xTickCount }, { tickCount: yTickCount });
  }, frames);

  const { xLines, yLines } = tickPixelLines(plotArea, xScale, yScale, xTickCount, yTickCount);

  return {
    backend: "canvas2d",
    dpr: options.dpr ?? 1,
    width,
    height,
    xTicks: xTickCount,
    yTicks: yTickCount,
    lineSegments: xLines.length + yLines.length,
    avgFrameUs: Math.round(avg),
    p95FrameUs: Math.round(p95),
    frames,
  };
}

/** Benchmark WebGL grid spike (returns null if WebGL unavailable) */
export function benchmarkWebGLGrid(options: {
  width?: number;
  height?: number;
  dpr?: number;
  xTickCount?: number;
  yTickCount?: number;
  frames?: number;
} = {}): GridBenchmarkResult | null {
  const width = Math.round((options.width ?? 1920) * (options.dpr ?? 1));
  const height = Math.round((options.height ?? 1080) * (options.dpr ?? 1));
  const xTickCount = options.xTickCount ?? 24;
  const yTickCount = options.yTickCount ?? 16;
  const frames = options.frames ?? 120;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  let spike: WebGLGridSpike;
  try {
    spike = new WebGLGridSpike(canvas);
  } catch {
    return null;
  }

  const plotArea = makePlotArea(width, height);
  const xScale = new LinearScale();
  const yScale = new LinearScale();
  xScale.setDomain(0, 1_000_000);
  yScale.setDomain(-1, 1);
  xScale.setRange(plotArea.x, plotArea.x + plotArea.width);
  yScale.setRange(plotArea.y + plotArea.height, plotArea.y);

  const { xLines, yLines } = tickPixelLines(plotArea, xScale, yScale, xTickCount, yTickCount);
  const spec: GridLineSpec = { plotArea, xLines, yLines, width, height };

  let lineSegments = 0;
  const { avg, p95 } = measureFrames(() => {
    lineSegments = spike.draw(spec);
  }, frames);

  spike.destroy();

  return {
    backend: "webgl",
    dpr: options.dpr ?? 1,
    width,
    height,
    xTicks: xTickCount,
    yTicks: yTickCount,
    lineSegments,
    avgFrameUs: Math.round(avg),
    p95FrameUs: Math.round(p95),
    frames,
  };
}

/** Compare backends; recommends implement if WebGL ≥20% faster */
export function compareGridBackends(options?: {
  dpr?: number;
  frames?: number;
}): GridCompareResult {
  const dpr = options?.dpr ?? 2;
  const frames = options?.frames ?? 120;

  const canvas2d = benchmarkCanvasGrid({ dpr, frames, showMinor: true });
  const webgl = benchmarkWebGLGrid({ dpr, frames });

  if (!webgl) {
    return {
      canvas2d,
      webgl: null,
      gainPercent: 0,
      recommendation: "defer",
    };
  }

  const gainPercent = ((canvas2d.avgFrameUs - webgl.avgFrameUs) / canvas2d.avgFrameUs) * 100;

  return {
    canvas2d,
    webgl,
    gainPercent: Math.round(gainPercent * 10) / 10,
    recommendation: gainPercent >= 20 ? "implement" : "defer",
  };
}

/** Vertex builder smoke test (no GL required) */
export function countGridVertices(xTickCount: number, yTickCount: number): number {
  const spec: GridLineSpec = {
    plotArea: { x: 60, y: 40, width: 800, height: 400 },
    xLines: Array.from({ length: xTickCount }, (_, i) => 60 + i * 30),
    yLines: Array.from({ length: yTickCount }, (_, i) => 40 + i * 25),
    width: 960,
    height: 540,
  };
  return buildGridLineVertices(spec).length / 2;
}
