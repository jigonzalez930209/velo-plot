---
title: Trading Bundle (velo-plot/trading)
description: Tree-shaken entry point for trading dashboards — stacked charts, indicators, drawings, replay, and datafeed.
---

# Trading Bundle

Stage 2 ships a focused bundle that excludes 3D and scientific plugins while exporting everything needed for trading dashboards.

## Import

```typescript
import {
  createStackedChart,
  createChart,
  PluginDrawingTools,
  PluginReplay,
  PluginKeyboard,
  createMockDatafeed,
  barsToOhlc,
  mapToBusinessDayScale,
  computeHeikinAshi,
} from 'velo-plot/trading'
```

The full library (`velo-plot` / `velo-plot/full`) exports the same trading APIs.

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

## Chart methods (Stage 2)

These methods are available on every `Chart` instance:

```typescript
// High-level indicators
await chart.addIndicator('rsi', { period: 14 })

// Price alerts
chart.on('alert', (e) => console.log(e))
const id = chart.addAlert({ price: 100, direction: 'above' })
chart.getAlerts()
chart.removeAlert(id)
chart.clearAlerts()

// Position lines (entry / SL / TP)
chart.addPositionLine({ price: 102, style: 'entry' })

// Drawing mode (requires PluginDrawingTools)
chart.setDrawingMode('trendline')
```

On `createStackedChart`, use `stack.addIndicator()` and `stack.getChart('price')` for pane-specific APIs.

## Related

- [Migration v1 → v2](/guide/migration-v2)
- [Trading Dashboard example](/examples/trading-dashboard)
- [Time Scale API](/api/trading-time-scale)
- [High-level Indicators](/api/trading-indicators)
- [Alerts & Position Lines](/api/trading-alerts)
- [Drawing Tools](/api/plugin-drawing-tools)
- [Replay Plugin](/api/plugin-replay)
- [Datafeed API](/api/datafeed)
