# Trading Indicators (addIndicator)

One-liner presets for RSI, MACD, Bollinger, EMA, SMA, and Stochastic — Stage 2 high-level API.

```typescript
import { createStackedChart } from 'velo-plot/trading'

const stack = createStackedChart({
  container: document.getElementById('chart'),
  panes: [
    { id: 'price', series: [{ id: 'ohlc', type: 'candlestick', data: ohlc }] },
    { id: 'volume', height: 0.18, series: [{ id: 'vol', type: 'bar', data: volume }] },
  ],
})

// Overlay on price pane
await stack.addIndicator('bollinger', { period: 20, stdDev: 2, sourceSeriesId: 'ohlc' })
await stack.addIndicator('ema', { period: 20, sourceSeriesId: 'ohlc' })
await stack.addIndicator('sma', { period: 50, sourceSeriesId: 'ohlc' })

// New oscillator panes
await stack.addIndicator('rsi', { period: 14, pane: 'new' })
await stack.addIndicator('macd', {
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
  pane: 'new',
})
await stack.addIndicator('stochastic', { period: 14, signalPeriod: 3, pane: 'new' })
```

## Single-chart overlay

```typescript
import { createChart } from 'velo-plot/trading'

const chart = createChart({ container })
chart.addSeries({ id: 'candles', type: 'candlestick', data: ohlc })

await chart.addIndicator('bollinger', { period: 20 })
await chart.addIndicator('rsi', { period: 14 })
```

## Preset reference

| Preset | Placement | Key options |
|--------|-----------|-------------|
| `rsi` | oscillator | `period` (default 14) |
| `macd` | oscillator | `fastPeriod`, `slowPeriod`, `signalPeriod` |
| `bollinger` | overlay | `period`, `stdDev` |
| `ema`, `sma` | overlay | `period` |
| `stochastic` | oscillator | `period`, `signalPeriod` |

Calculations run on the async worker pool when available.

## Related

- [API: High-level Indicators](/api/trading-indicators)
- [Trading Dashboard](./trading-dashboard.md)
- [Financial Indicators (manual API)](./indicators.md)
