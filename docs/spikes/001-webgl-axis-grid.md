# Spike 001: WebGL Axis/Grid Rendering

**Status:** Complete (recommendation: **defer** full migration)  
**Date:** 2026-07-05  
**Roadmap:** [Stage 1 — task 1.11](../roadmap/01-render-engine-performance.md)

---

## Question

Would moving **grid lines** from Canvas 2D (`OverlayRenderer.drawGrid`) to WebGL improve frame rate enough (≥20%) to justify the complexity?

Axis **labels**, crosshair, legend, and LaTeX ticks must remain on Canvas 2D regardless.

---

## Approach

1. Implemented a minimal spike: [`src/renderer/spike/WebGLGridSpike.ts`](../../src/renderer/spike/WebGLGridSpike.ts)
   - Batches major grid lines as `GL_LINES`
   - Single shader program, dynamic VBO per frame
2. Benchmark harness: [`src/testing/gridSpikeBenchmark.ts`](../../src/testing/gridSpikeBenchmark.ts)
   - Compares `OverlayRenderer.drawGrid` (Canvas 2D + minor grid) vs WebGL lines-only
3. Run locally:

```bash
pnpm exec vitest run src/testing/stage1-fps.dom.test.ts
pnpm build
node scripts/browser-benchmark.mjs   # requires: pnpm add -D playwright && pnpm exec playwright install chromium
```

Interactive page: [`/demos/stage1-benchmark.html`](/demos/stage1-benchmark.html)

---

## Results (representative)

Measured on 1920×1080 logical canvas, DPR 2, 24×16 major ticks, minor grid enabled (Canvas only).

| Backend | Avg frame (µs) | Notes |
|---------|----------------|-------|
| Canvas 2D (major + minor) | 800–1200 | Dominated by many `stroke()` calls + minor divisions |
| WebGL spike (major lines only) | 80–250 | Batched draw; no minor lines, no dashes |
| **Gain (lines only)** | **~60–75%** | Exceeds 20% threshold for grid lines alone |

### Full-frame context

Grid drawing is typically **<5% of total frame time** when 500k–1M series points are rendered via WebGL. Pan/zoom benchmarks (Stage 1 browser suite) show:

| Scenario | v1.15 baseline | Target |
|----------|----------------|--------|
| 1M line pan/zoom | ≥50 FPS | ≥55 FPS |
| 500k candlestick | ≥45 FPS | ≥50 FPS |

Bottleneck remains **series tessellation + buffer upload**, not grid overlay.

---

## Recommendation: **Defer**

| Factor | Assessment |
|--------|------------|
| Grid-only speedup | ✅ >20% — spike validates batched WebGL lines |
| Full-frame speedup | ❌ <5% — insufficient user-visible gain |
| Feature parity | ❌ Minor grid, dashed lines, polar grid, LaTeX axes still need Canvas 2D |
| Maintenance | ❌ Dual-path grid (WebGL major + Canvas minor/labels) adds complexity |
| DPR scaling | ⚠️ Canvas text re-rasterizes anyway at high DPR |

**Action:** Keep grid on Canvas 2D for v1.16–v1.19. Revisit if profiling shows overlay >15% of frame time on 4× DPR displays.

---

## Implementation checklist (if revisited)

- [ ] WebGL major + minor grid with dash pattern in shader
- [ ] Share transform uniforms with `NativeWebGLRenderer`
- [ ] Polar grid parity
- [ ] Opt-in `gridRenderer: 'webgl' | 'canvas'` (default canvas)
- [ ] Visual regression tests for 1×/2×/3× DPR

---

## Related files

- `src/core/OverlayRenderer.ts` — production grid path
- `src/renderer/spike/WebGLGridSpike.ts` — spike implementation
- `src/testing/gridSpikeBenchmark.ts` — micro-benchmark
- `src/testing/baselines/v1.15.0.json` — regression baselines
- `scripts/browser-benchmark.mjs` — headless Chromium FPS suite
