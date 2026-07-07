# Trade Markers & Position Lines

Visualize entries, exits, and open positions on candlestick charts.

## Trade markers

```typescript
import { createChart } from 'velo-plot/trading'

const chart = createChart({ container })
chart.addSeries({ id: 'ohlc', type: 'candlestick', data: ohlc })

const series = chart.getSeries('ohlc')
series?.setMarkers([
  {
    time: ohlc.x[10],
    shape: 'arrowUp',
    position: 'belowBar',
    text: 'Buy',
    color: '#22c55e',
  },
  {
    time: ohlc.x[30],
    shape: 'arrowDown',
    position: 'aboveBar',
    text: 'Sell',
    color: '#ef4444',
  },
])
```

| Field | Values |
|-------|--------|
| `shape` | `'arrowUp'`, `'arrowDown'`, `'circle'`, `'square'` |
| `position` | `'belowBar'`, `'aboveBar'`, `'inBar'` |
| `time` | Epoch ms or logical index (with business-day scale) |

## Position lines

Entry, stop-loss, and take-profit horizontal levels:

```typescript
import { PluginAnnotations } from 'velo-plot/plugins/annotations'

await chart.use(PluginAnnotations())

chart.addPositionLine({ price: 102, style: 'entry' })
chart.addPositionLine({ price: 98, style: 'sl' })
chart.addPositionLine({ price: 108, style: 'tp' })
```

Custom labels and colors:

```typescript
chart.addPositionLine({
  price: 105,
  label: 'Break-even',
  color: '#f59e0b',
  interactive: true,
})
```

## Related

- [API: Alerts & Markers](/api/trading-alerts)
- [Price Alerts](./trading-alerts.md)
- [Trading Dashboard](./trading-dashboard.md)
