# Migration Guide: v2.x → v3.0

velo-plot **v3.0** consolidates the platform after Stages 2–4 (trading, scientific depth, React DX). Most v2 apps keep working; this guide covers bundle layout, deprecations, and intentional breaks.

If you are still on v1.x, migrate to v2 first: [Migration v1 → v2](/guide/migration-v2).

## Bundle entry points

Prefer the smallest bundle that covers your app:

| Import | Use when |
|--------|----------|
| `velo-plot` | Core charts, themes, scales — no 3D / ML / trading plugins |
| `velo-plot/trading` | Candles, stacked panes, indicators, drawings, replay, alerts, datafeed |
| `velo-plot/scientific` | Analysis, FFT, regression, forecasting, LaTeX, 3D |
| `velo-plot/full` | Everything (heavier; same surface as the old kitchen-sink import) |
| `velo-plot/react` (and `/vue`, `/svelte`, `/solid`, `/angular`, `/astro`) | Framework bindings |

```typescript
// Trading dashboard
import { createStackedChart, PluginDrawingTools } from 'velo-plot/trading'

// Scientific lab
import { createChart, PluginAnalysis, PluginForecasting } from 'velo-plot/scientific'

// Still valid
import { createChart } from 'velo-plot'
import { createChart } from 'velo-plot/full'
```

## Breaking changes

| Change | Action |
|--------|--------|
| Prefer dedicated bundles over importing everything from the root | Switch trading apps to `velo-plot/trading`, scientific apps to `velo-plot/scientific` |
| `PluginSync` is a deprecated stub | Use `ChartGroup` / `createChartGroup` from `velo-plot` (or `/full`). **Removed in v4.0** |
| `chart.setPanMode(boolean)` | Use `chart.setMode('pan' \| 'select')`. **Removed in v4.0** |
| `chart.syncDragLayout()` | Prefer CSS transforms on pane wrappers during resize. **Removed in v4.0** |
| Crosshair `showAxisLabels` | Use `valueDisplayMode: 'floating' \| 'disabled'`. **Removed in v4.0** |
| Stacked `getChart(id)` | Prefer `getPane(id)` (alias kept). **Removed in v4.0** |
| `SciPlot` / `useSciPlot` / `SciChart` / `useSciChart` | Prefer `VeloPlot` / `useVeloPlot` (aliases kept). **Removed in v4.0** |

v2 trading APIs (`addIndicator`, business-day scale, drawings, replay, alerts) are unchanged.

## SVG export

Per-chart `exportSVG()` / snapshot SVG remains **partial**. Full vector parity of every series and overlay is [Stage 6](/roadmap/06-svg-vector-parity) (target v4). Stack export stays raster via `stack.exportImage()`.

## React / framework DX

Declarative components and reactive hooks ship under framework entries:

```tsx
import { StackedPlot, useIndicator } from 'velo-plot/react'
```

See [What's new in v3](/guide/whats-new-v3) and the [React guide](/guide/react).

## Checklist

1. Pick `trading` or `scientific` (or keep `full`).
2. Replace any `PluginSync` usage with `ChartGroup`.
3. Replace `setPanMode` with `setMode`.
4. Read [PLUGIN-STATUS](/PLUGIN-STATUS) for experimental / partial plugins.
5. Run your app against `3.0.0-rc.1` before GA.
