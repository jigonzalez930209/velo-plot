---
title: Scientific Bundle (velo-plot/scientific)
description: Tree-shaken entry for scientific visualization — heatmaps, analysis, FFT, regression, 3D, LaTeX, and extended series types.
---

# Scientific Bundle (`velo-plot/scientific`)

Focused bundle for **scientific and specialized visualization**. Excludes trading-only plugins (drawings, replay, alerts) while including analysis, 3D, and extended series.

**~114 KB gzip** (minified ESM). Importing this entry runs `registerScientific.ts`, which registers extended series buffers, frame renderers, overlay drawers, heatmap shaders, WebGPU hook, and SVG export.

## Import

```typescript
import {
  createChart,
  createStackedChart,
  Series,
  PluginAnalysis,
  PluginForecasting,
  PluginLaTeX,
  Plugin3D,
  PluginRegression,
  PluginBrokenAxis,
  PluginVirtualization,
  LinearScale,
  DARK_THEME,
} from 'velo-plot/scientific'
```

## What you get vs core

| Category | Included |
|----------|----------|
| **Series** | `bar`, `heatmap`, `polar`, `boxplot`, `waterfall`, `gauge`, `sankey` (+ all core types) |
| **Export** | `chart.exportSVG()`, `stack.exportSVG()` (sync, patched) |
| **Renderer** | `renderer: 'webgpu'` opt-in, `renderer: 'svg'` live vector |
| **Stacked** | `createStackedChart` |
| **Analysis** | `PluginAnalysis`, FFT, peaks, integration — standalone utils via `velo-plot/plugins/analysis` or re-exported from scientific |
| **Math / fit** | `PluginRegression`, `PluginForecasting` |
| **Labels** | `PluginLaTeX` |
| **3D** | `Plugin3D` and 3D renderer exports |
| **Layout** | `PluginBrokenAxis`, `PluginVirtualization` |
| **Themes** | Extended theme set (`MIDNIGHT_THEME`, `ELECTROCHEM_THEME`, …) |

## What is excluded (use trading entry)

| Feature | Import instead |
|---------|----------------|
| `chart.addIndicator()` presets | `velo-plot/trading` |
| Price alerts, position lines | `velo-plot/trading` |
| `PluginDrawingTools`, `PluginReplay` | `velo-plot/trading` |
| Heikin-ashi, business-day scale | `velo-plot/trading` |
| Datafeed / mock OHLCV | `velo-plot/trading` |

For apps that need **both** trading and scientific features, use `velo-plot/full`.

::: info Financial indicators
Functions like `sma`, `ema`, and `rsi` are **not** re-exported from the main scientific entry. Import them from `velo-plot/plugins/analysis` or use `velo-plot/full`.
:::

## Extended series example

```typescript
import { createChart } from 'velo-plot/scientific'

const chart = createChart({ container })

chart.addSeries({
  id: 'density',
  type: 'heatmap',
  data: { /* xValues, yValues, zValues */ },
  style: { colorScale: { name: 'viridis' } },
})
```

## Analysis plugins

```typescript
import { createChart, PluginAnalysis } from 'velo-plot/scientific'

const chart = createChart({ container })
const analysis = chart.use(PluginAnalysis())

// Plugin API available on chart.analysis after init
```

See [Scientific Analysis guide](/guide/analysis) and [Analysis API](/api/analysis).

## 3D

```typescript
import { Plugin3D } from 'velo-plot/scientific'

chart.use(Plugin3D({ /* … */ }))
```

See [3D Getting Started](/guide/3d/getting-started).

## Registration

Like trading, the scientific entry performs side-effect registration on import:

```typescript
// src/scientific/index.ts
import './registerScientific'
```

`registerScientific` calls `registerExtendedSeries()` + `patchExportSVG()`. It does **not** patch trading chart methods.

## Bundle size

| Metric | Value |
|--------|-------|
| Gzip (minified ESM) | ~114 KB |
| CI budget | 200 KB |
| vs core-only | +~63 KB |

## Related

- [Bundle Architecture](/guide/bundle-architecture)
- [Core Bundle](/api/core-bundle)
- [Trading Bundle](/api/trading-bundle)
- [Large Datasets](/guide/large-datasets)
- [ADR 004](/adr/004-core-bundle-slimming)
