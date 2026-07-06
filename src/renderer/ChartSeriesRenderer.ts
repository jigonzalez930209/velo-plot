/**
 * Shared chart series renderer type (WebGL2 native or GPU abstraction / WebGPU).
 */

import type { NativeWebGLRenderer } from "./NativeWebGLRenderer";
import type { GpuChartRenderer } from "./GpuChartRenderer";

export type ChartSeriesRenderer = NativeWebGLRenderer | GpuChartRenderer;

export type ChartRendererBackend = "webgl" | "webgpu";

export function getRendererBackend(renderer: ChartSeriesRenderer): ChartRendererBackend {
  if ("backend" in renderer && renderer.backend === "webgpu") {
    return "webgpu";
  }
  return "webgl";
}
