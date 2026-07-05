# Stage 3: Scientific Depth

> **Target versions:** v2.1.0 → v2.2.0  
> **Prerequisite:** Stage 0 complete  
> **Parallel with:** [02-trading-experience.md](./02-trading-experience.md)

---

## Goal

Honor velo-plot's scientific roots. Complete partially implemented analysis plugins, polish specialized chart types, and deliver end-to-end scientific workflows — not just API reference pages.

Scientific and trading tracks are **equal priority**; this stage runs in parallel with Stage 2.

---

## Current state

### Scientific strengths (v1.12.0)

| Area | Status | Location |
|------|--------|----------|
| FFT, filters, peaks, cycles | ✅ Stable | `src/plugins/analysis/` |
| Curve fitting / regression (8 methods) | ✅ | `src/plugins/regression/` |
| 3D renderers (surface, voxel, ribbon, etc.) | ✅ | `src/plugins/3d/` |
| Polar, radar, ternary, gauge, sankey | ✅ | Dedicated renderers |
| LaTeX axis labels (native parser) | ✅ Limited | `src/plugins/latex/` (~100 commands) |
| Contour / spectrogram | ✅ | `Contour3DData`, analysis plugin |
| Anomaly detection | ✅ | `src/plugins/anomaly-detection/` |
| ML integration (native NN, regression) | ⚠️ Partial | `src/plugins/ml/` — simple models only |
| Pattern recognition | ⚠️ Partial | Built-in patterns; custom throws |
| Forecasting | ❌ Stub | Methods throw in `algorithms.ts` |
| Python Jupyter bindings | ❓ Unverified | Listed complete in legacy roadmap |
| WASM shared memory bridge | ❓ Unverified | Listed complete in legacy roadmap |
| Video recording plugin | ❓ Unverified | Needs audit |

### Documentation gaps

- Scientific workflows are fragmented across 60+ example pages
- No single "electrochemical analysis" or "signal processing pipeline" guide
- LaTeX limitations documented only in AGENT.md
- Ternary/contour edge cases in `docs/examples/ternary-charts.md` limitations section

---

## Work items

### P0 — Complete or cut forecasting

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 3.1 | Forecasting audit | P0 | Low | List each method in `algorithms.ts` → implement / remove / experimental |
| 3.2 | Implement native ARIMA (simple) | P0 | High | `chart.forecast('s1', { method: 'arima', horizon: 50 })` works |
| 3.3 | Implement exponential smoothing | P1 | Medium | Alternative to ARIMA for smooth series |
| 3.4 | Confidence bands on forecast series | P1 | Medium | Shaded band via `band` series type |
| 3.5 | Update forecasting example + API docs | P0 | Low | Remove references to throwing methods |

### P0 — Pattern recognition completion

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 3.6 | Custom pattern registration API | P1 | High | `chart.patterns.register('my-pattern', template)` |
| 3.7 | Visual overlay for detected patterns | P1 | Medium | Highlight regions on chart overlay |
| 3.8 | Bridge to trading: chart pattern signals | P2 | Medium | Emit events consumable by Stage 2 alert system |

### P1 — LaTeX expansion

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 3.9 | Expand command vocabulary to 300+ | P1 | High | Matrices, fractions, common operators |
| 3.10 | LaTeX in legend and annotations | P1 | Medium | `annotation.latex: true` |
| 3.11 | Performance: cache rendered glyphs | P1 | Low | Already partial — verify no leak |

### P1 — Specialized chart polish

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 3.12 | Ternary chart edge cases | P1 | Medium | Boundary points, label overlap, docs update |
| 3.13 | Contour isoline labels | P1 | Medium | Readable labels at zoom levels |
| 3.14 | Polar grid enhancement verification | P2 | Low | Confirm legacy "Phase 2" item truly complete |
| 3.15 | Broken axis (`xAxis.broken`) | P2 | High | Listed in legacy roadmap — audit if exists or implement |

### P1 — ML plugin hardening

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 3.16 | ML plugin audit | P1 | Low | Document supported model types and limits |
| 3.17 | Training API for small datasets | P2 | High | On-chart fit with visualized residuals |
| 3.18 | Prediction overlay series | P1 | Medium | `chart.ml.visualizePredictions()` renders correctly |

### P2 — External bindings audit

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 3.19 | Python bindings: verify or reclassify | P2 | High | Working Jupyter widget demo, or remove from "complete" |
| 3.20 | WASM bridge: verify or reclassify | P2 | High | SharedArrayBuffer demo, or mark experimental |
| 3.21 | Video recording plugin audit | P2 | Medium | `webm` export works in Chrome/Firefox |

### P1 — Scientific workflow guides

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 3.22 | Guide: signal processing pipeline | P1 | Medium | `docs/guide/signal-processing.md` — FFT → filter → peaks |
| 3.23 | Guide: cyclic voltammetry analysis | P1 | Medium | End-to-end polar chart workflow |
| 3.24 | Guide: publication-ready export | P1 | Low | Theme + LaTeX + PluginSnapshot 8K workflow |
| 3.25 | Example: forecasting with confidence bands | P1 | Low | Interactive demo |

---

## Scientific + trading convergence points

| Scientific feature | Trading use |
|--------------------|---------------|
| Pattern recognition | Chart pattern alerts |
| Forecasting | Price projection overlay |
| Anomaly detection | Unusual volume/price alerts |
| FFT / filters | Noise reduction on indicators |
| Regression | Trend line fitting (complements drawing tools) |

---

## Risks

| Risk | Mitigation |
|------|------------|
| ARIMA implementation complexity | Start with AR(1) and MA(1); expand iteratively |
| LaTeX scope unbounded | Target 300 commands covering 95% of scientific notation |
| Python/WASM may not exist | Honest reclassification beats false "complete" status |
| 3D + trading bundle bloat | Keep 3D in `velo-plot/full` and `velo-plot/scientific` only |

---

## Exit checklist (v2.2.0)

- [ ] PluginForecasting: zero throwing public methods
- [ ] ARIMA forecast with confidence bands shipped
- [ ] Custom pattern API or explicitly removed
- [ ] LaTeX vocabulary ≥300 commands documented
- [ ] Ternary + contour limitations addressed or documented
- [ ] ML plugin audit published
- [ ] Python/WASM status honestly documented (complete, experimental, or removed)
- [ ] 3 new scientific workflow guides in docs
- [ ] Vitest coverage ≥35% lines (including forecasting tests)
