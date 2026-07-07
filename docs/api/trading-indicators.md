---
title: High-Level Indicators (addIndicator)
description: One-liner RSI, MACD, Bollinger, EMA, SMA, and Stochastic on charts and stacked layouts.
---

# High-Level Indicators

Stage 2 adds `chart.addIndicator()` and `stack.addIndicator()` — calculate via the async worker pool and render automatically.

## Presets

| Preset | Placement | Default options |
|--------|-----------|-----------------|
| `rsi` | oscillator pane | `period: 14` |
| `macd` | oscillator pane | `fastPeriod: 12`, `slowPeriod: 26`, `signalPeriod: 9` |
| `bollinger` / `bollingerBands` | price overlay | `period: 20`, `stdDev: 2` |
| `ema` | price overlay | `period: 20` |
| `sma` | price overlay | `period: 20` |
| `stochastic` | oscillator pane | `period: 14`, `signalPeriod: 3` |

## Single chart

```typescript
import { createChart } from 'velo-plot/trading'

const chart = createChart({ container })
chart.addSeries({ id: 'ohlc', type: 'candlestick', data: ohlc })

await chart.addIndicator('bollinger', { period: 20, sourceSeriesId: 'ohlc' })
await chart.addIndicator('rsi', { period: 14, id: 'rsi' })
```

## Stacked chart

```typescript
import { createStackedChart } from 'velo-plot/trading'

const stack = createStackedChart({ container, panes: [pricePane, volumePane] })

await stack.addIndicator('rsi', { period: 14, pane: 'new' })
await stack.addIndicator('macd', { pane: 'new', paneHeight: 0.22 })
await stack.addIndicator('stochastic', { period: 14, pane: 'new' })
```

## Options (`AddIndicatorOptions`)

| Property | Type | Description |
|----------|------|-------------|
| `sourceSeriesId` | `string` | Price source (default: first line/candlestick/bar) |
| `period` | `number` | Lookback for RSI, SMA, EMA, Bollinger, Stochastic |
| `fastPeriod` / `slowPeriod` / `signalPeriod` | `number` | MACD parameters |
| `stdDev` | `number` | Bollinger standard deviation multiplier |
| `pane` | `'inline'` \| `'new'` | Stacked only — append a new pane |
| `paneHeight` | `number` | Flex ratio when `pane: 'new'` (default `0.25`) |
| `id` | `string` | Root series id |
| `label` | `string` | Y-axis label for new panes |

## Return value

```typescript
const result = await chart.addIndicator('rsi', { period: 14 })
// { id: 'rsi', preset: 'rsi', placement: 'oscillator', seriesIds: ['rsi-line', ...] }
```

## Low-level helpers

```typescript
import {
  addIndicatorToChart,
  buildIndicatorPaneFromPreset,
  computeIndicatorFromSeries,
} from 'velo-plot/trading'

const computed = await computeIndicatorFromSeries(chart, 'macd', { sourceSeriesId: 'ohlc' })
const pane = await buildIndicatorPaneFromPreset('rsi', x, close, { id: 'rsi', height: 0.24 })
```

Calculations use the Stage 1 worker pool when available. See also [Async Indicators](/api/indicators-async) and [Composite Indicator Panes](/api/indicator-panes).

## Related

- [Trading Indicators example](/examples/trading-indicators)
- [Trading Dashboard](/examples/trading-dashboard)
- [Migration v1 → v2](/guide/migration-v2)
