# ADR 001: WebGPU Renderer Strategy

**Status:** Accepted (Phase 2 complete — v1.17)  
**Date:** 2026-07-05  
**Stage:** [01-render-engine-performance](../roadmap/01-render-engine-performance.md) (tasks 1.1–1.3, 1.2)

## Context

`ChartOptions.renderer` accepts `"webgl" | "webgpu"`. Experimental code existed in `src/gpu/` but was not wired as the chart renderer.

## Decision

1. **`renderer: "webgl"`** (default) — `NativeWebGLRenderer`.
2. **`renderer: "webgpu"`** — `GpuChartRenderer` with WebGPU backend; WebGL2 fallback if unavailable.
3. **`PluginGpu`** — GPU compute experiments outside the chart loop.

## Implementation (v1.17)

| Component | Path |
|-----------|------|
| Chart adapter | `src/renderer/GpuChartRenderer.ts` |
| GPU facade | `src/gpu/adapter/gpuRenderer.ts` — `renderNativeSeries()` |
| WebGPU triangles | `WebGPUBackend.renderSolidTriangles()` — uniform-color bars/boxes |
| Benchmarks | `line-200k-webgl` / `line-200k-webgpu` + `evaluateRendererCompare()` |

### Chart WebGPU parity

| Series | WebGPU |
|--------|--------|
| line, scatter, step, band, bar, heatmap | ✅ |
| candlestick | ✅ (bullish/bearish triangles) |
| boxplot | ✅ (faces + whiskers) |
| waterfall | ✅ (pos/neg/subtotal bars + connectors) |
| polar, gauge, sankey | WebGL-only |

## Revisit criteria

- [x] Line + candlestick parity
- [x] Boxplot + waterfall parity
- [x] No warning when WebGPU init succeeds
- [x] Fallback when `navigator.gpu` unavailable
- [ ] Benchmark ≥ WebGL FPS on discrete GPU (CI smoke only; desktop verify locally)
- [ ] Plot-area scissor + `plotAreaBackground` on WebGPU path

## Related

- [createChart renderer option](/api/chart#renderer-backend)
- Browser suite: `/demos/stage1-benchmark.html`
