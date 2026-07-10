---
title: Core Bundle (velo-plot)
description: Minimal entry point — line, scatter, step, band, area charts with WebGL2 and the plugin system.
---

# Core Bundle (`velo-plot`)

The default npm export. Smallest chart engine: **~51 KB gzip** (minified ESM, typical import).

Use this when you need basic 2D series and will load plugins explicitly. Do **not** use for trading dashboards or scientific heatmaps without also importing an extended entry.

::: warning Extended series
`candlestick`, `bar`, `heatmap`, `polar`, `boxplot`, `waterfall`, `gauge`, and `sankey` **throw at runtime** unless you import `velo-plot/trading`, `velo-plot/scientific`, or `velo-plot/full`.
:::

## Import

```typescript
import {
  createChart,
  Series,
  EventEmitter,
  NativeWebGLRenderer,
  parseColor,
  createRenderer,
  LinearScale,
  LogScale,
  DARK_THEME,
  LIGHT_THEME,
  PluginManagerImpl,
  createPlugin,
  definePlugin,
  registerPlugin,
} from 'velo-plot'
```

## Exports

| Category | Symbols |
|----------|---------|
| Chart | `createChart` |
| Data | `Series` |
| Events | `EventEmitter` |
| Types | `Chart`, `ChartOptions`, `SeriesOptions`, `SeriesData`, `Bounds`, `AxisOptions`, … |
| Scales | `LinearScale`, `LogScale`, `createScale` |
| Renderer | `NativeWebGLRenderer`, `parseColor`, `createRenderer`, `createNativeRenderer` |
| Themes | `DARK_THEME`, `LIGHT_THEME`, `DEFAULT_THEME`, `createTheme`, `getThemeByName` |
| Plugins | `PluginManagerImpl`, `createPluginContext`, `getPluginRegistry`, `registerPlugin`, `definePlugin`, `createPlugin`, `createConfigurablePlugin` |

**Not exported from core** (use extended entries or `velo-plot/plugins/*`):

- `AnimationEngine`, `easings` (animations still work via `chart` options)
- `createStackedChart`, trading/scientific plugins
- `addIndicatorToChart`, datafeed helpers

## Supported series types

| Type | Core | Notes |
|------|------|-------|
| `line` | ✅ | |
| `scatter` | ✅ | |
| `line+scatter` | ✅ | |
| `step`, `step+scatter` | ✅ | |
| `band`, `area` | ✅ | Stacked fill via `stackId` |
| Error bars | ✅ | On any series with error fields |
| `bar` | ❌ | → `velo-plot/trading` or `velo-plot/scientific` |
| `heatmap` | ❌ | → `velo-plot/trading` or `velo-plot/scientific` |
| `candlestick` | ❌ | → `velo-plot/trading` |
| `polar`, `boxplot`, `waterfall` | ❌ | → `velo-plot/scientific` |
| `gauge`, `sankey` | ❌ | → `velo-plot/scientific` (Canvas overlay) |
| `heikin-ashi` | ❌ | → `velo-plot/trading` (converts to candlestick) |

## Chart methods available

All standard navigation, series, annotation (via plugins), and export APIs **except**:

| Method | Core behavior |
|--------|----------------|
| `addIndicator()` | Throws — use `velo-plot/trading` |
| `addAlert()`, `removeAlert()`, … | Throws — use `velo-plot/trading` |
| `addPositionLine()` | Throws — use `velo-plot/trading` |
| `setDrawingMode()` | Throws — use `velo-plot/trading` |
| `exportSVG()` | Throws — use `exportImage()` or extended entry |
| `exportImage()` | ✅ PNG/JPEG |

## `createChart` options (core-specific)

```typescript
const chart = createChart({
  container: document.getElementById('chart')!,
  renderer: 'webgl',     // 'webgpu' is ignored on core; needs extended entry
  loading: true,         // opt-in; default is no loading overlay
  animations: true,      // zoom/pan animations (engine in core)
  showLegend: true,      // defaults to theme.legend.visible unless set
  showControls: false,
})
```

## Plugins on core

Load only what you need:

```typescript
import { createChart } from 'velo-plot'
import { PluginAnnotations } from 'velo-plot/plugins/annotations'

const chart = createChart({ container })
chart.use(PluginAnnotations())
```

See [Plugin System](/guide/plugins) and [per-plugin entries](/api/plugins).

## Bundle size

| Metric | Value |
|--------|-------|
| Gzip (minified ESM) | ~51 KB |
| CI budget | 52 KB |
| Measure locally | `pnpm build && pnpm check:bundle-size` |

## Related

- [Bundle Architecture](/guide/bundle-architecture) — full decision tree
- [Trading Bundle](/api/trading-bundle)
- [Scientific Bundle](/api/scientific-bundle)
- [Migration v2 → v3](/guide/migration-v3)
- [ADR 004: Core slimming](/adr/004-core-bundle-slimming)
