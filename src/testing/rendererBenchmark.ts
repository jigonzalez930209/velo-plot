/**
 * WebGL vs WebGPU chart renderer comparison helpers.
 * @module testing/rendererBenchmark
 */

import type { BenchmarkResult } from "./index";

export interface RendererCompareResult {
  webgl: BenchmarkResult;
  webgpu: BenchmarkResult | null;
  webgpuActive: boolean;
  /** webgpuFps / webglFps — ≥1 means WebGPU is faster or equal */
  fpsRatio: number;
  /** Meets ADR target: WebGPU ≥ 95% of WebGL FPS */
  meetsTarget: boolean;
  recommendation: "webgpu-ready" | "webgl-faster" | "webgpu-unavailable";
}

export function evaluateRendererCompare(
  webgl: BenchmarkResult,
  webgpu: BenchmarkResult | null,
  webgpuActive: boolean,
  minRatio = 0.95,
): RendererCompareResult {
  if (!webgpuActive || !webgpu) {
    return {
      webgl,
      webgpu,
      webgpuActive: false,
      fpsRatio: 0,
      meetsTarget: false,
      recommendation: "webgpu-unavailable",
    };
  }

  const ratio = webgl.avgFps > 0 ? webgpu.avgFps / webgl.avgFps : 0;
  const meetsTarget = ratio >= minRatio;

  return {
    webgl,
    webgpu,
    webgpuActive: true,
    fpsRatio: ratio,
    meetsTarget,
    recommendation: meetsTarget ? "webgpu-ready" : "webgl-faster",
  };
}
