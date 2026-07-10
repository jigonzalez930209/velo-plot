# ADR 004: Core bundle slimming (registry pattern)

**Status:** Accepted (v3.0.0)  
**Date:** 2026-07-10  
**Related:** [ADR 002](/adr/002-bundle-entry-split), [Bundle Architecture](/guide/bundle-architecture)

## Context

After v3 bundle entry split, the core entry (`velo-plot`) still measured **~76 KB gzip**. Most of that was `ChartCore` pulling:

- Extended series buffer interleave (candlestick, bar, heatmap, polar, boxplot, waterfall)
- Extended WebGL frame renderers and heatmap shaders
- Trading APIs (`addIndicator`, alerts, drawing mode) compiled into `ChartCore`
- WebGPU renderer adapter (~54 KB when bundled)
- Gauge/Sankey overlay renderers
- SVG exporter, plugin loading overlay (default on)
- Full `plugins/index` barrel from `index.core.ts`

Goal: **~40 KB gzip** stretch target for core; pragmatic milestone **~52 KB** with CI enforcement.

## Decision

### 1. Series buffer registry

- **Core** (`SeriesBufferLite.ts`): line, scatter, step, band, area, error bars, stacked bands.
- **Extended** (`seriesBufferExtended.ts`): registers handlers for bar, heatmap, candlestick, polar, boxplot, waterfall, heikin-ashi fallback.
- Unknown types in core → throw with actionable import hint.

### 2. Frame render registry

- **Core** (`renderFrame.ts`): line, scatter, step, band, error bars.
- **Extended** (`frameRenderExtended.ts`): bar, heatmap, boxplot, waterfall via `frameRenderRegistry`.

### 3. Shader split

- **Core** (`programFactoryCore.ts`): line + point programs; heatmap slot uses line program stub.
- **Extended** (`programFactoryExtended.ts`): compiles real heatmap shader on first heatmap via `NativeWebGLRenderer.installHeatmapProgram()`.

### 4. Trading extension module

`src/trading/registerTrading.ts` (side-effect on `velo-plot/trading` import):

- Patches `ChartImpl` prototype: `addIndicator`, `addAlert`, `addPositionLine`, `setDrawingMode`.
- Registers series option preprocessors: heikin-ashi, business-day, indicator expansion.
- Wires `ChartFeatureHooks` for alert evaluation (replaces inline `ChartAlertManager` in core).

### 5. WebGPU out of core graph

- Removed `import()` of `GpuChartRenderer` from `ChartCore`.
- `registerWebGPU.ts` sets `ChartImpl.afterConstruct` when extended bundle loads.
- Core-only apps never pull `gpuRenderer` chunk.

### 6. Overlay & export

- Gauge/Sankey → `overlaySeriesRegistry` + `overlaySeriesExtended.ts`.
- Core `exportSVG()` throws; `chartExportPatch.ts` restores sync SVG on trading/scientific/full.

### 7. Slim `index.core.ts`

- Direct imports from `PluginManager`, `PluginRegistry`, `NativeWebGLRenderer`, `RendererInterface`.
- No `AnimationEngine` re-export (animations still on chart instance).
- `"sideEffects": false` in `package.json`.

### 8. Loading overlay opt-in

- `loading: true` required; no longer default `loading !== false`.

## Consequences

### Positive

- Core **76 → 51 KB gzip** (−33%); trading **92 → 72 KB**; scientific **132 → 114 KB**.
- Clear runtime errors when wrong entry is used.
- Registration is idempotent; safe to import multiple extended entries.
- ADR-documented extension points for future series types.

### Negative

- **Breaking:** Core-only apps lose candlestick/trading/SVG/WebGPU without importing extended entry.
- **Breaking:** Loading overlay off by default.
- Side-effect imports required (`import 'velo-plot/trading'` not just deep paths).
- TypeScript `Chart` interface still lists trading methods (optional at runtime on core).

### Not yet done (stretch to 40 KB)

- Lazy `AnimationEngine` / `ChartAnimatedNavigation` module.
- Serialization moved entirely out of core graph.
- Optional `velo-plot/lite` entry without legend/controls/state manager.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| `#ifdef`-style build flavors (core/lite/full) | Multiple npm packages or build matrix; harder DX |
| Keep everything in core, rely on tree-shaking only | esbuild still pulled WebGPU + extended interleave via static imports |
| Dynamic `import()` inside core for all heavy features | Consumer bundlers still include dynamic targets in single-chunk graphs |
| Remove trading methods from `Chart` interface | Breaks typing for trading consumers; kept runtime stubs instead |

## Implementation map

| File | Role |
|------|------|
| `src/core/chart/series/SeriesBufferLite.ts` | Core buffer path |
| `src/core/chart/series/seriesTypeRegistry.ts` | Handler registry |
| `src/renderer/seriesBufferExtended.ts` | Extended buffer handlers |
| `src/renderer/registerExtendedSeries.ts` | Orchestrates all extended registration |
| `src/trading/registerTrading.ts` | Trading patch + preprocessors |
| `src/scientific/registerScientific.ts` | Extended series + SVG (no trading patch) |
| `src/renderer/registerWebGPU.ts` | WebGPU afterConstruct hook |
| `src/core/chart/chartExportPatch.ts` | SVG on extended bundles |
| `scripts/check-bundle-size.mjs` | CI budgets |
