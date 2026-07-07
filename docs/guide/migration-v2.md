# Migration Guide: v1.x → v2.0

Stage 2 (Trading Experience) adds high-level trading APIs. Existing v1.x code continues to work; new APIs are opt-in.

## New import path

```typescript
// Recommended for trading apps
import { createStackedChart, PluginDrawingTools } from 'velo-plot/trading'

// Still valid — full bundle
import { createStackedChart } from 'velo-plot'
```

## Indicators: manual → `addIndicator()`

**Before (v1.x):**

```typescript
import { rsi } from 'velo-plot/plugins/analysis'
import { buildIndicatorPane } from 'velo-plot'

const { values } = rsi(close, 14)
// manual pane config + series wiring...
```

**After (v2.0):**

```typescript
await chart.addIndicator('rsi', { period: 14 })
// stacked layout:
await stack.addIndicator('rsi', { period: 14, pane: 'new' })
```

Presets: `rsi`, `macd`, `bollinger`, `ema`, `sma`, `stochastic`.

## Time axis: epoch gaps → business-day scale

**Before:** `xAxis: { type: 'time' }` — weekends appear as flat gaps in wall-clock space.

**After:**

```typescript
xAxis: {
  type: 'time',
  timeScale: { calendar: 'business-day', session: '24x7' },
}
```

OHLC `x` values remain epoch milliseconds; the chart maps them to consecutive business-day indices internally.

## Drawing tools

Load `PluginDrawingTools` and use `chart.setDrawingMode('trendline' | 'horizontal' | 'rectangle' | 'fibonacci')`. Pair with `PluginKeyboard` for Ctrl+Z / Ctrl+Y undo.

## Trade markers

```typescript
chart.getSeries('ohlc')?.setMarkers([
  { time: timestamp, shape: 'arrowUp', position: 'belowBar', text: 'Buy' },
])
```

## Price alerts

```typescript
chart.on('alert', (e) => { /* { price, direction, triggerPrice } */ })
chart.addAlert({ price: 100, direction: 'above' })
```

## Breaking changes

| Change | Action |
|--------|--------|
| None required for v1.x charts | Keep existing imports |
| `heikin-ashi` series type | New — use `type: 'heikin-ashi'` instead of manual `computeHeikinAshi` |
| `syncSelection` | Fixed in v1.13+ — enable via `ChartGroup` options |

## portfolio-fall integration

Replace manual indicator pane setup with:

```typescript
const stack = createStackedChart({ /* price + volume panes */ })
await stack.addIndicator('rsi', { period: 14, pane: 'new' })
await stack.addIndicator('macd', { pane: 'new' })
stack.getChart('price').setDrawingMode('trendline')
```

See [Trading dashboard example](../examples/trading/dashboard.md).
