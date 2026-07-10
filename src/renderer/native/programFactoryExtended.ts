import type { ProgramBundle } from "./types";
import { HEATMAP_FRAG, HEATMAP_VERT } from "./shaderSources";
import { createProgram } from "./programFactoryCore";

/** Compile the heatmap shader program (scientific/trading/full bundles). */
export function registerHeatmapProgram(
  gl: WebGLRenderingContext,
  bundle: ProgramBundle,
): void {
  bundle.heatmapProgram = createProgram(gl, HEATMAP_VERT, HEATMAP_FRAG, "heatmap");
}
