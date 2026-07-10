/**
 * Registers extended series buffers and frame renderers for trading/scientific/full bundles.
 */
import { registerExtendedSeriesBuffers } from "./seriesBufferExtended";
import { registerExtendedFrameRenderers } from "./native/frameRenderExtended";
import { registerExtendedOverlayDrawers } from "./overlaySeriesExtended";
import { registerHeatmapProgram } from "./native/programFactoryExtended";
import { NativeWebGLRenderer } from "./NativeWebGLRenderer";
import { registerWebGPURenderer } from "./registerWebGPU";

let registered = false;

export function registerExtendedSeries(): void {
  if (registered) return;
  registered = true;
  NativeWebGLRenderer.heatmapProgramInstaller = registerHeatmapProgram;
  registerWebGPURenderer();
  registerExtendedSeriesBuffers();
  registerExtendedFrameRenderers();
  registerExtendedOverlayDrawers();
}
