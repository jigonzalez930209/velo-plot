# Heikin-Ashi Charts

Heikin-Ashi smooths candlestick noise by averaging OHLC values. Stage 2 provides a native series type and a compute helper.

## Series type

```typescript
import { createChart } from 'velo-plot/trading'

const chart = createChart({ container })

// Pass raw OHLC — rendering uses derived Heikin-Ashi values
chart.addSeries({
  id: 'ha',
  type: 'heikin-ashi',
  data: { x: times, open, high, low, close },
  style: {
    bullishColor: '#22c55e',
    bearishColor: '#ef4444',
  },
})
```

## Manual transform

```typescript
import { computeHeikinAshi } from 'velo-plot/trading'

const ha = computeHeikinAshi({ x: times, open, high, low, close })
// ha.open, ha.high, ha.low, ha.close — Float32Arrays

chart.addSeries({
  id: 'ha-manual',
  type: 'candlestick',
  data: { x: times, ...ha },
})
```

Heikin-Ashi series render through the candlestick renderer internally.

## Related

- [API: Candlestick](/api/candlestick)
- [Candlestick example](./candlestick.md)
- [Hollow Candles](./trading-hollow-candles.md)
