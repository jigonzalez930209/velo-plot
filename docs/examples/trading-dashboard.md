# Trading Dashboard

Full multi-pane trading layout: price, volume, RSI, and MACD — the Stage 2 reference example.

```typescript
import {
  createStackedChart,
  PluginDrawingTools,
  PluginReplay,
  PluginKeyboard,
} from 'velo-plot/trading'

// ... generate or load OHLCV data (see trading-session.md) ...

const stack = createStackedChart({
  container: document.getElementById('chart'),
  panes: [
    {
      id: 'price',
      series: [{ id: 'ohlc', type: 'candlestick', data: ohlc }],
    },
    {
      id: 'volume',
      height: 0.18,
      series: [{ id: 'vol', type: 'bar', data: { x: ohlc.x, y: volume } }],
    },
  ],
  xAxis: {
    type: 'time',
    timeScale: { calendar: 'business-day', session: '24x7' },
  },
})

const priceChart = stack.getChart('price')

// Indicators
await stack.addIndicator('rsi', { period: 14, pane: 'new' })
await stack.addIndicator('macd', { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, pane: 'new' })

// Trade markers
priceChart.getSeries('ohlc')?.setMarkers([
  { time: ohlc.x[10], shape: 'arrowUp', position: 'belowBar', text: 'Buy' },
])

// Position lines
priceChart.addPositionLine({ price: 102, style: 'entry' })
priceChart.addPositionLine({ price: 98, style: 'sl' })
priceChart.addPositionLine({ price: 108, style: 'tp' })

// Drawing tools + keyboard undo/redo
await priceChart.use(PluginDrawingTools())
await priceChart.use(PluginKeyboard())
priceChart.setDrawingMode('trendline')

// Price alerts
priceChart.on('alert', (e) => console.log('Alert:', e))
priceChart.addAlert({ price: 105, direction: 'above' })

// Bar replay
await priceChart.use(PluginReplay({ seriesId: 'ohlc' }))
const replay = priceChart.getPlugin('velo-plot-replay')
replay?.play(2)
```

## Bundle import

Use `velo-plot/trading` for a tree-shaken entry that excludes 3D and scientific plugins:

```typescript
import { createStackedChart, addIndicatorToChart } from 'velo-plot/trading'
```

The full library (`velo-plot` / `velo-plot/full`) exports the same trading APIs.

## Related examples

Stage 2 feature coverage — each item has a dedicated example and API page:

| Feature | Example | API |
|---------|---------|-----|
| Business-day time scale | [Trading session](./trading-session.md) | [Time scale](/api/trading-time-scale) |
| `addIndicator()` presets | [Trading indicators](./trading-indicators.md) | [addIndicator](/api/trading-indicators) |
| Drawing tools + Fibonacci | [Drawing tools](./trading-drawing-tools.md) | [PluginDrawingTools](/api/plugin-drawing-tools) |
| Trade markers | [Markers & positions](./trading-markers-positions.md) | [Alerts & markers](/api/trading-alerts) |
| Position lines | [Markers & positions](./trading-markers-positions.md) | [Alerts & markers](/api/trading-alerts) |
| Price alerts | [Price alerts](./trading-alerts.md) | [Alerts & markers](/api/trading-alerts) |
| Heikin-Ashi | [Heikin-Ashi](./trading-heikin-ashi.md) | [Candlestick](/api/candlestick) |
| Hollow candles | [Hollow candles](./trading-hollow-candles.md) | [Candlestick](/api/candlestick) |
| Bar replay | [Bar replay](./trading-replay.md) | [PluginReplay](/api/plugin-replay) |
| Mock datafeed | [Mock datafeed](./trading-datafeed.md) | [Datafeed](/api/datafeed) |
| Full bundle | — | [Trading bundle](/api/trading-bundle) |
| Migration from v1 | [Migration guide](/guide/migration-v2) | — |

Also see [Candlestick charts](./candlestick.md), [Pane stack](./pane-stack.md), and [Financial indicators (manual API)](./indicators.md).
