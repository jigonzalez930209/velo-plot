> **ARCHIVED — Historical document.**  
> Frozen around the v1.6.2 proposal (2026-01-13). **No longer maintained as an active plan.**  
> Many items originally marked “COMPLETED” were stubs or partial implementations (July 2026 audit).  
> Current plan toward **v3.0.0**: [Development Roadmap](./roadmap/README.md) · Plugin status: [PLUGIN-STATUS](./PLUGIN-STATUS.md) · Current release: **3.0.0**.

---

# Velo Plot — Legacy Roadmap (historical)

> **Original document version:** 1.6.2  
> **Original date:** 2026-01-13  
> **Editorial update:** 2026-07-10 (English + status reconciled with Stage 0–5 audit)  
> **Status:** Historical reference only

---

## Executive summary

This document was the **~39-feature proposal** (8 categories, 4 phases) to grow `velo-plot` as a native scientific charting library (no third-party charting dependencies).

What follows is the **historical catalog** of that proposal, with **reconciled status** against the real codebase and [PLUGIN-STATUS](./PLUGIN-STATUS.md) as of **v3.0.0**.

| Legend (reconciled status) | Meaning |
|----------------------------|---------|
| **Done** | Available and usable in production / release |
| **Partial** | Exists, with documented gaps |
| **Experimental** | Opt-in, stub, or paused backend |
| **Not done** | Never implemented or cancelled |
| **Absorbed** | Covered by Stages 0–6 under a different shape / name |

---

## How to read this file

1. Code samples are **illustrative of the original proposal**; the real API may differ (see current docs).
2. The original “Phase 1–4 at 100%” tables were **not reliable**; they are corrected below.
3. For new work, always use [docs/roadmap/](./roadmap/README.md).

---

## Library status (2026-07 context, not 2026-01)

### Architecture

| Component | Real status | Notes |
|-----------|-------------|-------|
| WebGL2 renderer | Done | High-performance 2D engine |
| Plugin system | Done | Modular; see status registry |
| React (+ Vue/Svelte/Solid/Angular/Astro) | Done | Stage 4 DX |
| 3D rendering | Done | `Plugin3D` / `velo-plot/scientific` |
| Streaming | Done | WebSocket + backpressure |
| Multi-pane / trading | Done | `createStackedChart`, `velo-plot/trading` |
| WebGPU | Experimental | Opt-in; WebGL2 default |
| Sync via `PluginSync` | Experimental | Deprecated stub → use `ChartGroup` (removed in v4) |

### Current bundles (v3)

See **[Bundle Architecture](/guide/bundle-architecture)** for sizes, decision tree, and registration model.

| Import | Gzip (approx.) | Contents |
|--------|----------------|----------|
| `velo-plot` | ~51 KB | Line/scatter/step/band, plugins API |
| `velo-plot/trading` | ~72 KB | + candles, stacked, indicators, alerts, WebGPU |
| `velo-plot/scientific` | ~114 KB | + heatmap, analysis, 3D, LaTeX |
| `velo-plot/full` | heavier | Everything |
| `velo-plot/react` (and other frameworks) | — | Bindings |

**Branding aliases (deprecated, still work):** `SciPlot` / `useSciPlot` / `SciChart` / `useSciChart` → `VeloPlot` / `useVeloPlot` (**removed in v4.0**).

---

## Catalog of the 39 features (original proposal)

### Category 1 — Data & export

| # | Feature | Reconciled status | Notes |
|---|---------|-------------------|-------|
| 1 | PluginDataExport | Done | CSV, JSON, etc. |
| 2 | PluginDataImport | Not done | No unified CSV/HDF5/parquet plugin |
| 3 | PluginSnapshot | Done / Partial SVG | Raster OK; full SVG → [Stage 6](./roadmap/06-svg-vector-parity.md) |
| 4 | PluginPDF | Not done | — |
| 5 | PluginDataTransform | Done | normalize / smooth / etc. pipeline |

```typescript
// Original sketch — DataExport
chart.use(PluginDataExport({
  formats: ['csv', 'json'],
  includeMetadata: true,
}))
```

---

### Category 2 — New visualization types

| # | Feature | Reconciled status | Notes |
|---|---------|-------------------|-------|
| 6 | Radar / Spider | Done | `PluginRadar` |
| 7 | Waterfall | Done | Series / 2D–3D demos |
| 8 | Polar | Done | Polar core |
| 9 | Gauge / Dial | Done | — |
| 10 | Sankey / Flow | Done | — |

---

### Category 3 — Interaction & UX

| # | Feature | Reconciled status | Notes |
|---|---------|-------------------|-------|
| 11 | PluginTouch (pinch, etc.) | Absorbed | Pinch-zoom / touch in Stage 4 (not necessarily same name) |
| 12 | PluginVoice | Not done | Cancelled in original plan |
| 13 | PluginGestures | Partial / Absorbed | Partly covered by core interaction |
| 14 | PluginContextMenu | Done | — |
| 15 | PluginAccessibility | Absorbed / Partial | ARIA, keyboard, high-contrast, reduced-motion (Stage 4); not the exact proposed plugin |

---

### Category 4 — Analysis & AI/ML

| # | Feature | Reconciled status | Notes |
|---|---------|-------------------|-------|
| 16 | PluginMLIntegration | Partial | Simple native NN/regression |
| 17 | PluginAnomalyDetection | Done | — |
| 18 | PluginPatternRecognition | Partial | Built-in patterns OK; `custom` incomplete |
| 19 | PluginRegression | Done | Multiple fitting methods |
| 20 | PluginForecasting | Done | sma/ema/holt/holtWinters/arima, etc. (not Prophet/LSTM as in the sketch) |

```typescript
// Original sketch — Forecasting (real API: see plugin docs)
chart.use(PluginForecasting({ horizon: 100, confidence: 0.95 }))
```

---

### Category 5 — Performance & architecture

| # | Feature | Reconciled status | Notes |
|---|---------|-------------------|-------|
| 21 | PluginOffscreen | Partial | Requires OffscreenCanvas |
| 22 | PluginLazyLoad | Done | Chunks / unload |
| 23 | PluginVirtualization | Done | LOD + workers |
| 24 | PluginCaching | Done | — |
| 25 | PluginCompression | Not done | — |

---

### Category 6 — Collaboration & sharing

| # | Feature | Reconciled status | Notes |
|---|---------|-------------------|-------|
| 26 | PluginCollaboration | Not done | Cancelled |
| 27 | PluginEmbedding | Not done | — |
| 28 | PluginShare | Not done | — |

---

### Category 7 — Advanced scientific visualization

| # | Feature | Reconciled status | Notes |
|---|---------|-------------------|-------|
| 29 | Error bars / box plots | Done (error bars) | Box plots not a separate priority item |
| 30 | Ternary charts | Done | — |
| 31 | Contours / isolines | Done | Analysis / 3D depending on case |

---

### Category 8 — Publication & presentation

| # | Feature | Reconciled status | Notes |
|---|---------|-------------------|-------|
| 32 | LaTeX rendering | Done | Native plugin |
| 33 | Publication themes | Partial / Absorbed | Themes + ThemeEditor; no closed “Nature” package |
| 34 | Broken axes | Done | `PluginBrokenAxis` |
| 35 | ROI selection | Done | `PluginROI` |
| 36 | Drag & drop editing | Done | `PluginDragEdit` |
| 37 | Python bindings | Not done / external | Not part of the current web npm package |
| 38 | WASM zero-copy bridge | Partial / Experimental | Workers / TypedArrays; not the Rust bridge as described |
| 39 | Native video recording | Done | `PluginVideoRecorder` |

---

## Phased plan (original proposal → reality)

The original document marked phases as **“100% complete”**. That was **not true** at API/quality level. Honest mapping:

### Phase 1 — v1.7.x (immediate impact)

| Feature | Original claim | Reality |
|---------|----------------|---------|
| PluginDataExport | Complete | Done |
| PluginContextMenu | Complete | Done |
| Polar Charts | Complete | Done |
| PluginAnomalyDetection | Complete | Done |
| PluginAccessibility | Cancelled | Absorbed later in Stage 4 (a11y) |

### Phase 2 — v1.8.x (extended analysis)

| Feature | Original claim | Reality |
|---------|----------------|---------|
| PluginMLIntegration | Complete | **Partial** |
| PluginPatternRecognition | Complete | **Partial** |
| PluginRegression | Complete | Done |
| Radar / Snapshot / LaTeX / Ternary | Complete | Done (SVG snapshot partial) |

### Phase 3 — v1.9.x (performance)

| Feature | Original claim | Reality |
|---------|----------------|---------|
| PluginOffscreen | Complete | **Partial** |
| LazyLoad / Virtualization / Caching | Complete | Done |
| ROI / Broken axis / DragEdit / Video | Complete | Done |
| Contours | Complete | Done |

### Phase 4 — v1.10.x (“next generation”)

| Feature | Original claim | Reality |
|---------|----------------|---------|
| Collaboration / Voice | Cancelled | Not done |
| PluginForecasting | Complete | Done (native methods; not Prophet/LSTM) |
| Gauge / Sankey | Complete | Done |
| Python bindings / WASM bridge | Complete | **Not** as described |
| Video | Complete | Done |

---

## Infrastructure & DX (original checklist)

| Item | Reconciled status |
|------|-------------------|
| Vitest tests | Done |
| Benchmarks | Done (CI warning mode) |
| TypeDoc | Not a priority (VitePress) |
| Storybook | Not done |
| Playwright E2E | Done |
| Plugin scaffolding CLI | Done (Stage 4) |
| VS Code snippets | Partial / optional |
| Online playground | Done (templates / docs) |
| TypeScript strict | Done (public `any` cleanup → post-v3 polish) |
| Strict SemVer | Done (CONTRIBUTING policy; v3.0.0) |
| Document breaking changes | Done ([CHANGELOG](../CHANGELOG.md), [migration-v3](./guide/migration-v3.md)) |

---

## Metrics the legacy plan proposed

| KPI | Jan 2026 proposal | Jul 2026 notes |
|-----|-------------------|----------------|
| 10M points @ 60 FPS | Goal | Verified via Stage 1 benchmarks (do not assume the old claim) |
| Lighthouse a11y > 90 | Goal | Stage 4 improvements; measure per app |
| Less boilerplate | Goal | Covered by React/StackedPlot / `addIndicator` |
| npm / stars | Adoption goal | Out of scope for this file |

---

## Conclusion (updated)

The legacy roadmap was an early-2026 **wish list**. Much of it shipped, but the document **overstated** completeness (stubs, partial APIs, misleading WebGPU/`PluginSync`).

The official path is:

| Stage | Theme | Version |
|-------|-------|---------|
| 0 | API honesty audit | v1.13–v1.15 |
| 1 | Engine / virtualization / workers | v1.16–v1.19 |
| 2 | Trading experience | v2.0+ |
| 3 | Scientific depth | v2.x |
| 4 | React / DX / frameworks | v2.2–v2.9 |
| 5 | Stable platform | **v3.0.0** |
| 6 | SVG vector parity | v4.0 |

**Do not open issues or PRs against this file.** Use the [active roadmap](./roadmap/README.md) and [plugin status](./PLUGIN-STATUS.md).

---

*Historical file. Last editorial update: 2026-07-10.*
