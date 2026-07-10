---
title: Trading Bundle (velo-plot/trading)
description: Tree-shaken entry point for trading dashboards — stacked charts, indicators, drawings, replay, and datafeed.
---

# Trading Bundle (`velo-plot/trading`)

Focused bundle for **trading dashboards**. Excludes 3D and heavy scientific plugins while registering candlestick support, trading chart methods, and WebGPU opt-in.

**~72 KB gzip** (minified ESM). Importing this entry runs `registerTrading.ts` automatically.

::: tip Import the entry
Always import from `'velo-plot/trading'`, not deep file paths. Registration side-effects run on entry import.
:::

## Import

```typescript
import {
  createStackedChart,
  createChart,
  PluginDrawingTools,
  PluginReplay,
  PluginKeyboard,
  PluginStreaming,
  createMockDatafeed,
  barsToOhlc,
  mapToBusinessDayScale,
  computeHeikinAshi,
  addIndicatorToChart,
  ChartGroup,
} from 'velo-plot/trading'
```

## Exports

| Category | Symbols |
|----------|---------|
| Charts | `createChart`, `createStackedChart` |
| Time scale | `mapToBusinessDayScale`, `isBusinessDay`, `businessDaySpanMs`, `applyBusinessDayX`, `formatBusinessDayTick` |
| Indicators | `addIndicatorToChart`, `buildIndicatorPaneFromPreset`, `computeIndicatorFromSeries` |
| Series helpers | `computeHeikinAshi` |
| Chart methods | `chart.addIndicator()`, `chart.addAlert()`, `chart.addPositionLine()`, `chart.setDrawingMode()` |
| Plugins | `PluginDrawingTools`, `PluginReplay`, `PluginKeyboard`, `PluginStreaming` |
| Datafeed | `createMockDatafeed`, `barsToOhlc`, `DatafeedAdapter` |
| Sync | `ChartGroup` |
| OHLCV utils | `generateBusinessDayOhlcv`, `generateContinuousOhlcv`, … |

The full library (`velo-plot/full`) exports the same trading APIs plus scientific plugins.

## What registers on import

`registerTradingBundle()` (side-effect):

1. `registerExtendedSeries()` — candlestick buffers, frame paths, WebGPU, SVG
2. Trading series preprocessors — heikin-ashi, business-day X, indicator expansion
3. `ChartImpl` prototype patch — `addIndicator`, alerts, position lines, drawing mode
4. `patchExportSVG()` — sync vector export

## Chart methods

```typescript
import { createChart } from 'velo-plot/trading'

const chart = createChart({ container })

// High-level indicators
await chart.addIndicator('rsi', { period: 14 })

// Price alerts
chart.on('alert', (e) => console.log(e))
const id = chart.addAlert({ price: 100, direction: 'above' })
chart.getAlerts()
chart.removeAlert(id)

// Position lines (entry / SL / TP)
chart.addPositionLine({ price: 102, style: 'entry' })

// Drawing mode (requires PluginDrawingTools)
chart.use(PluginDrawingTools())
chart.setDrawingMode('trendline')
```

On `createStackedChart`, use `stack.addIndicator()` and `stack.getChart('price')` for pane-specific APIs.

## Series types (trading)

| Type | Support |
|------|---------|
| `candlestick` | ✅ |
| `heikin-ashi` | ✅ (converted to candlestick OHLC) |
| Business-day `x` | ✅ when `xAxis.timeScale.calendar: 'business-day'` |
| `bar`, `heatmap`, `polar` | ✅ via shared extended registration (prefer `/scientific` if primary) |

## WebGPU

```typescript
import { createChart } from 'velo-plot/trading'

const chart = createChart({
  container,
  renderer: 'webgpu', // falls back to WebGL2 if unavailable
})
```

Requires trading (or scientific/full) entry — not available on core-only import.

## Bundle size

Measured after `pnpm build` with `pnpm check:bundle-size` (minified ESM, typical `import` graph):

| Entry | Gzip (approx.) | CI budget |
|-------|----------------|-----------|
| `velo-plot` (core) | ~51 KB | 52 KB |
| `velo-plot/trading` | ~72 KB | 150 KB |
| `velo-plot/scientific` | ~114 KB | 200 KB |

CI fails if an entry exceeds its budget. Re-run locally:

```bash
pnpm build && pnpm check:bundle-size
```

Report: [`bundle-size-report.json`](https://github.com/jigonzalez930209/velo-plot/blob/main/bundle-size-report.json).

## Related

- [Bundle Architecture](/guide/bundle-architecture)
- [Core Bundle](/api/core-bundle)
- [Migration v1 → v2](/guide/migration-v2)
- [Migration v2 → v3](/guide/migration-v3)
- [Trading Dashboard example](/examples/trading/dashboard)
- [Time Scale API](/api/trading-time-scale)
- [High-level Indicators](/api/trading-indicators)
- [Alerts & Position Lines](/api/trading-alerts)
- [Drawing Tools](/api/plugin-drawing-tools)
- [Replay Plugin](/api/plugin-replay)
- [Datafeed API](/api/datafeed)
