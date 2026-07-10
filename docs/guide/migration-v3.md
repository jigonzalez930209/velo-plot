# Migration Guide: v2.x → v3.0

velo-plot **v3.0** consolidates the platform after Stages 2–4 (trading, scientific depth, React DX). Most v2 apps keep working when they import the right bundle entry; this guide covers layout, deprecations, and intentional breaks.

If you are still on v1.x, migrate to v2 first: [Migration v1 → v2](/guide/migration-v2).

::: tip Read first
[Bundle Architecture](/guide/bundle-architecture) is the canonical reference for entry points, sizes, and the registration model.
:::

## Bundle entry points

Prefer the **smallest** bundle that covers your app:

| Import | Use when | Gzip (approx.) |
|--------|----------|----------------|
| `velo-plot` | Line/scatter/step/band only — minimal JS | ~51 KB |
| `velo-plot/trading` | Candles, stacked panes, indicators, drawings, replay, alerts, WebGPU | ~72 KB |
| `velo-plot/scientific` | Heatmap, bar, polar, analysis, FFT, 3D, LaTeX | ~114 KB |
| `velo-plot/full` | Everything (legacy kitchen-sink) | heavier |
| `velo-plot/react` (and `/vue`, `/svelte`, …) | Framework bindings | +framework |

```typescript
// Trading dashboard — required for addIndicator, candlestick, alerts
import { createStackedChart, PluginDrawingTools } from 'velo-plot/trading'

// Scientific lab
import { createChart, PluginAnalysis } from 'velo-plot/scientific'

// Minimal line chart
import { createChart } from 'velo-plot'

// Legacy / all features
import { createChart } from 'velo-plot/full'
```

API references: [Core](/api/core-bundle) · [Trading](/api/trading-bundle) · [Scientific](/api/scientific-bundle)

## Breaking changes (v3.0)

| Change | Action |
|--------|--------|
| Trading APIs not in core | Import `velo-plot/trading` or `/full` for `addIndicator`, alerts, heikin-ashi |
| Extended series not in core | Import `velo-plot/trading`, `/scientific`, or `/full` for candlestick, heatmap, bar, … |
| `exportSVG()` not in core | Use `exportImage()` or extended entry |
| `renderer: 'webgpu'` not in core | Import extended entry |
| Loading overlay off by default | Pass `loading: true` to show init spinner |
| Prefer dedicated bundles over root for fat apps | Trading → `/trading`, scientific → `/scientific` |
| `PluginSync` deprecated | Use `ChartGroup` / `createChartGroup`. **Removed in v4.0** |
| `chart.setPanMode(boolean)` | Use `chart.setMode('pan' \| 'select')`. **Removed in v4.0** |
| `chart.syncDragLayout()` | Prefer CSS transforms on pane wrappers. **Removed in v4.0** |
| Crosshair `showAxisLabels` | Use `valueDisplayMode: 'floating' \| 'disabled'`. **Removed in v4.0** |
| Stacked `getChart(id)` | Prefer `getPane(id)` (alias kept). **Removed in v4.0** |
| `SciPlot` / `useSciPlot` aliases | Prefer `VeloPlot` / `useVeloPlot`. **Removed in v4.0** |

### Core-only limitations

If you only `import from 'velo-plot'`:

- **Series:** `line`, `scatter`, `step`, `band`, `area` (+ error bars). Others throw with an import hint.
- **Methods:** `addIndicator`, `addAlert`, `addPositionLine`, `setDrawingMode` throw.
- **Export:** `exportSVG()` throws; `exportImage()` works.
- **Renderer:** WebGL2 only unless you add an extended entry.

### Runtime error examples

```
[VeloPlot] Series type "candlestick" requires an extended bundle.
Import from 'velo-plot/trading', 'velo-plot/scientific', or 'velo-plot/full'.

[VeloPlot] addIndicator() requires the trading bundle. Import from 'velo-plot/trading'.
```

## Migration recipes

### Trading app (was `import from 'velo-plot'`)

```diff
- import { createStackedChart, PluginDrawingTools } from 'velo-plot'
+ import { createStackedChart, PluginDrawingTools } from 'velo-plot/trading'
```

No other changes if you already used Stage 2 APIs.

### Scientific app

```diff
- import { createChart, PluginAnalysis, Plugin3D } from 'velo-plot'
+ import { createChart, PluginAnalysis, Plugin3D } from 'velo-plot/scientific'
```

### Minimal sparkline (line only)

```typescript
import { createChart } from 'velo-plot' // stays on core — smallest bundle
```

### Still want one import for everything

```typescript
import { createChart } from 'velo-plot/full'
```

## SVG export

Per-chart `exportSVG()` remains **partial** on all entries. Full vector parity is [Stage 6](/roadmap/06-svg-vector-parity) (target v4). Stack export stays raster via `stack.exportImage()`.

On **core only**, `exportSVG()` throws — use `exportImage()` or an extended entry.

## React / framework DX

```tsx
import { StackedPlot, useIndicator } from 'velo-plot/react'
```

Ensure your app resolves the underlying chart entry (`trading` / `scientific` / `full`) in your bundler config. See [React guide](/guide/react).

## Checklist

1. Read [Bundle Architecture](/guide/bundle-architecture) and pick the right entry.
2. Replace root imports with `/trading`, `/scientific`, or `/full` as needed.
3. Set `loading: true` if you relied on the default loading overlay.
4. Replace `PluginSync` with `ChartGroup`.
5. Replace `setPanMode` with `setMode`.
6. Read [PLUGIN-STATUS](/PLUGIN-STATUS) for experimental plugins.
7. Run `pnpm build && pnpm check:bundle-size` in CI or locally to verify size.

## Related

- [What's new in v3](/guide/whats-new-v3)
- [ADR 002: Bundle split](/adr/002-bundle-entry-split)
- [ADR 004: Core slimming](/adr/004-core-bundle-slimming)
