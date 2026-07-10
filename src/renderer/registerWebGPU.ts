import { ChartImpl } from "../core/chart/ChartCore";
import { NativeWebGLRenderer } from "./NativeWebGLRenderer";

let registered = false;

/** Enable `renderer: 'webgpu'` for charts (extended bundles only). */
export function registerWebGPURenderer(): void {
  if (registered) return;
  registered = true;

  ChartImpl.afterConstruct = (chart, options) => {
    if (options.renderer !== "webgpu") return;
    (chart as { _webgpuInitPromise?: Promise<void> })._webgpuInitPromise =
      initWebGPURenderer(chart);
  };
}

async function initWebGPURenderer(chart: ChartImpl): Promise<void> {
  const c = chart as any;
  const { createGpuChartRenderer } = await import("./GpuChartRenderer");
  const gpu = await createGpuChartRenderer(c.webglCanvas, {
    backend: "webgpu",
    powerPreference: "high-performance",
  });

  if (gpu) {
    c.renderer = gpu;
    c.activeRendererType = gpu.backend;
    c.renderer.setDPR(c.dpr);
    c.renderLoop?.setRenderer(c.renderer);
    return;
  }

  console.warn(
    "[VeloPlot] WebGPU unavailable — falling back to WebGL2. " +
      "See docs/adr/001-webgpu-renderer-strategy.md.",
  );
  c.renderer = new NativeWebGLRenderer(c.webglCanvas);
  c.activeRendererType = "webgl";
  c.renderer.setDPR(c.dpr);
  c.renderLoop?.setRenderer(c.renderer);
}
