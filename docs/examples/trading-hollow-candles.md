# Hollow Candles

Hollow candlestick style — bullish candles render as outlines when `close >= open`.

```typescript
import { createChart } from 'velo-plot/trading'

const chart = createChart({ container })

chart.addSeries({
  id: 'ohlc',
  type: 'candlestick',
  data: { x: times, open, high, low, close },
  style: {
    hollow: true,
    bullishColor: '#22c55e',
    bearishColor: '#ef4444',
    barWidth: 0.7,
  },
})
```

| Style option | Type | Description |
|--------------|------|-------------|
| `hollow` | `boolean` | When `true`, bullish bodies are hollow (outline only) |
| `bullishColor` | `string` | Color for up candles |
| `bearishColor` | `string` | Color for down candles (filled) |

Works with business-day time scale and trade markers.

## Related

- [API: Candlestick](/api/candlestick)
- [Heikin-Ashi](./trading-heikin-ashi.md)
- [Trade Markers](./trading-markers-positions.md)
