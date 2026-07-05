# Stage 1: Render Engine & Performance

> **Target versions:** v1.16.0 → v1.19.0 (possible **v2.0.0** if breaking render API)  
> **Prerequisite:** [Stage 0 exit checklist](./00-foundation-audit.md#exit-checklist-v1150)  
> **Parallel with:** Stage 2/3 planning can start, but perf benchmarks should land first

---

## Goal

Make performance claims **measurable and reproducible**. Extend virtualization to all high-volume series types, resolve the WebGPU story, and offload heavy indicator computation to Web Workers.

Target: maintain **60 FPS** with 1M+ OHLC bars and 10M+ line points on mid-range hardware.

---

## Current state

### Rendering architecture

```
requestRender() → rAF coalesce → performRender()
  ├── WebGL: lines, bars, candlesticks, heatmap, bands
  └── Canvas 2D overlay: axes, grid, crosshair, legend, gauge, sankey, polar
```

Key files:

- `src/core/chart/ChartRenderLoop.ts` — frame scheduling, `flushRender()` for resize
- `src/renderer/native/NativeWebGLRenderer.ts` — zoom via uniforms, buffer reuse
- `src/core/chart/ChartRenderer.ts` — 2D overlay rendering
- `src/core/chart/ChartSetup.ts` — dual-canvas DOM setup, DPR handling

### Performance features (existing)

| Feature | Location | Scope |
|---------|----------|-------|
| LTTB / min-max downsampling | `src/workers/downsample.ts` | Line data |
| PluginVirtualization | `src/plugins/virtualization/` | line, scatter, step only |
| PluginOffscreen | `src/plugins/offscreen/` | Worker + OffscreenCanvas |
| PluginCaching | `src/plugins/caching/` | Buffer cache (TODO: auto-invalidate) |
| PluginLazyLoad | `src/plugins/lazy-load/` | Viewport chunks (TODO: distance unload) |
| GpuCompute | `src/gpu/compute/` | WebGPU stats (experimental) |
| WebGPURenderer | `src/renderer/WebGPURenderer.ts` | Experimental, not default |
| ChartInitQueue | `src/core/ChartInitQueue.ts` | Serializes multi-chart init |
| Backpressure | `src/streaming/backpressure.ts` | CircularBuffer for streams |

### Gaps

- Virtualization does **not** cover `candlestick` or `bar` — critical for trading
- Indicator calculations run on **main thread** (`src/plugins/analysis/indicators.ts`)
- Axes and grid render on **Canvas 2D**, not WebGL — potential bottleneck at high DPR
- WebGPU `renderer: "webgpu"` option logs warning and falls back
- No published benchmark suite in CI
- Legacy roadmap claimed "10M points @ 60 FPS" without automated verification

---

## Work items

### P0 — WebGPU decision

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 1.1 | WebGPU strategy document | P0 | Low | ADR: ship WebGPU as opt-in, or remove flag until ready |
| 1.2 | If shipping: complete WebGPU path for line + candlestick | P0 | Very High | `renderer: "webgpu"` renders without warning; fallback documented |
| 1.3 | If deferring: remove misleading `webgpu` option from public API | P0 | Low | No silent fallback; docs state WebGL2 only |

### P0 — Virtualization expansion

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 1.4 | LOD for candlestick series | P0 | High | PluginVirtualization handles OHLC; visible bars ≤ budget; 60 FPS with 500k bars in benchmark |
| 1.5 | LOD for bar / histogram series | P0 | High | Same as 1.4 for bar type |
| 1.6 | Viewport-aware data windowing API | P1 | Medium | `chart.setDataWindow({ from, to })` loads only visible range + buffer |

### P0 — Worker offload

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 1.7 | Indicator worker pool | P0 | High | `rsi()`, `macd()`, `bollingerBands()` callable via worker; main thread non-blocking for 100k+ points |
| 1.8 | Reuse `downsample.worker.ts` pattern | P1 | Low | Shared worker pool infrastructure in `src/workers/` |

### P1 — Render pipeline improvements

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 1.9 | Complete PluginCaching auto-invalidate | P1 | Medium | `src/plugins/caching/index.ts:388` TODO resolved |
| 1.10 | Complete PluginLazyLoad distance unloading | P1 | Medium | `src/plugins/lazy-load/index.ts:231` TODO resolved |
| 1.11 | Evaluate WebGL axis/grid rendering | P2 | Very High | Spike doc with FPS comparison; implement if >20% gain |
| 1.12 | Batch overlay redraws during stacked resize | P1 | Medium | Already partially done in v1.12 — verify no regression |

### P0 — Benchmarks

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 1.13 | Benchmark suite in `src/testing/` | P0 | Medium | Scripts: 1M line, 500k candlestick, 5-pane stack resize |
| 1.14 | CI benchmark job (non-blocking initially) | P1 | Low | GitHub Actions uploads results as artifact; alert on >20% regression |
| 1.15 | Document performance limits | P0 | Low | [large-datasets guide](../guide/large-datasets.md) updated with real numbers |

---

## Performance targets (v1.19.0)

| Scenario | Target | Measurement |
|----------|--------|-------------|
| 1M line points, pan/zoom | ≥55 FPS avg | Benchmark script |
| 500k candlestick bars, pan/zoom | ≥50 FPS avg | Benchmark script |
| 5-pane stacked chart, divider drag | ≥55 FPS avg | Benchmark script |
| First paint (empty chart) | <100ms | Lighthouse or custom |
| Indicator calc (RSI 14, 100k bars) | <200ms | Worker path |
| Memory (1M points, 3 series) | <300MB | Chrome heap snapshot |

---

## Risks

| Risk | Mitigation |
|------|------------|
| WebGL candlestick LOD changes visual fidelity | Document aggregation rules; allow `precision: 'full'` opt-out |
| WebGPU browser support fragmented | Feature-detect; WebGL always available |
| Worker serialization overhead | Transferable ArrayBuffers; benchmark before shipping |
| Breaking render options at v2.0 | Deprecation period in v1.18–v1.19 |

---

## Exit checklist (v1.19.0)

- [ ] WebGPU strategy executed (ship or remove flag)
- [ ] Candlestick + bar virtualization shipped
- [ ] Indicator worker pool for top 5 indicators (RSI, MACD, EMA, SMA, Bollinger)
- [ ] Benchmark suite runs locally and in CI
- [ ] Performance guide updated with verified numbers
- [ ] PluginCaching and PluginLazyLoad TODOs closed
- [ ] Vitest coverage ≥25% lines
- [ ] No FPS regression >10% vs v1.15 baseline on benchmark suite
