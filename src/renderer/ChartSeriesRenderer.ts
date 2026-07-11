/**
 * Shared chart series renderer type (WebGL2 native or GPU abstraction / WebGPU).
 */

import type { NativeWebGLRenderer } from "./NativeWebGLRenderer";
import type { GpuChartRenderer } from "./GpuChartRenderer";
import type { SVGChartRenderer } from "./SVGChartRenderer";

export type ChartSeriesRenderer = NativeWebGLRenderer | GpuChartRenderer | SVGChartRenderer;

export type ChartRendererBackend = "webgl" | "webgpu" | "svg";

export function getRendererBackend(renderer: ChartSeriesRenderer): ChartRendererBackend {
  if ("backend" in renderer && renderer.backend === "webgpu") {
    return "webgpu";
  }
  if ("backend" in renderer && renderer.backend === "svg") {
    return "svg";
  }
  return "webgl";
}
