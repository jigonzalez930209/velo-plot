/**
 * GpuChartRenderer — chart-facing adapter over GpuRenderer (WebGPU / WebGL backend).
 * Implements the same surface as NativeWebGLRenderer for ChartCore integration.
 */

import { GpuRenderer, type GpuRendererOptions } from "../gpu/adapter/gpuRenderer";
import type {
  NativeRenderOptions,
  NativeSeriesRenderData,
} from "./native/types";

/** Placeholder returned from getBuffer/getTexture when GPU abstraction owns the data. */
const GPU_HANDLE = {} as WebGLBuffer;

export class GpuChartRenderer {
  private gpu: GpuRenderer;
  private dpr: number;
  private readonly canvas: HTMLCanvasElement;

  constructor(gpu: GpuRenderer, canvas: HTMLCanvasElement) {
    this.gpu = gpu;
    this.canvas = canvas;
    this.dpr = window.devicePixelRatio || 1;
  }

  get available(): boolean {
    return this.gpu.available;
  }

  get backend(): "webgpu" | "webgl" {
    return this.gpu.activeBackend ?? "webgl";
  }

  setDPR(dpr: number): void {
    this.dpr = dpr;
    this.gpu.setDPR(dpr);
  }

  createBuffer(id: string, data: Float32Array): void {
    if (id.endsWith("_step")) {
      this.gpu.createStepBuffer(id, data);
      return;
    }
    this.gpu.createBuffer(id, data);
  }

  updateBuffer(id: string, data: Float32Array, offsetInBytes: number): boolean {
    return this.gpu.updateBuffer(id, data, offsetInBytes);
  }

  getBuffer(id: string): WebGLBuffer | undefined {
    return this.gpu.hasBuffer(id) ? GPU_HANDLE : undefined;
  }

  deleteBuffer(id: string): void {
    this.gpu.deleteBuffer(id);
  }

  createColormapTexture(id: string, data: Uint8Array): void {
    const seriesId = id.replace(/_colormap$/, "");
    this.gpu.createColormapTexture(seriesId, data);
  }

  getTexture(id: string): WebGLTexture | undefined {
    const seriesId = id.replace(/_colormap$/, "");
    return this.gpu.hasColormap(seriesId)
      ? (GPU_HANDLE as unknown as WebGLTexture)
      : undefined;
  }

  render(series: NativeSeriesRenderData[], options: NativeRenderOptions): void {
    this.gpu.renderNativeSeries(series, {
      bounds: options.bounds,
      backgroundColor: options.backgroundColor,
      plotArea: options.plotArea,
      invertX: options.invertX,
      plotAreaBackground: options.plotAreaBackground,
      dpr: this.dpr,
    });
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.round(rect.width * this.dpr);
    const height = Math.round(rect.height * this.dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.gpu.resize();
  }

  getLimits(): Record<string, unknown> {
    return this.gpu.getLimits();
  }

  destroy(): void {
    this.gpu.destroy();
  }
}

export async function createGpuChartRenderer(
  canvas: HTMLCanvasElement,
  options: GpuRendererOptions = {},
): Promise<GpuChartRenderer | null> {
  const gpu = new GpuRenderer(canvas, options);
  const ok = await gpu.init();
  if (!ok) return null;
  return new GpuChartRenderer(gpu, canvas);
}
