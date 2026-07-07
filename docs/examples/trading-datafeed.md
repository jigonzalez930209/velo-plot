# Mock Datafeed

Load historical and realtime OHLCV data via the UDF-inspired `DatafeedAdapter` contract.

```typescript
import { createChart, createMockDatafeed, barsToOhlc } from 'velo-plot/trading'

const feed = createMockDatafeed({ seed: 42 })

// Resolve symbol metadata
const info = await feed.resolveSymbol('MOCK')
console.log(info.name, info.timezone)

// Historical bars
const bars = await feed.getBars({
  symbol: 'MOCK',
  resolution: '1',
  from: Date.UTC(2024, 0, 1),
  to: Date.UTC(2024, 1, 1),
})

const ohlc = barsToOhlc(bars)

const chart = createChart({ container })
chart.addSeries({ id: 'ohlc', type: 'candlestick', data: ohlc })
```

## Realtime subscription

```typescript
const unsubscribe = feed.subscribeBars({
  symbol: 'MOCK',
  resolution: '1',
  onBar: (bar) => {
    chart.updateSeries('ohlc', {
      x: new Float64Array([bar.time]),
      open: new Float32Array([bar.open]),
      high: new Float32Array([bar.high]),
      low: new Float32Array([bar.low]),
      close: new Float32Array([bar.close]),
    })
  },
})

// Cleanup
unsubscribe()
```

## Custom adapter

Implement `DatafeedAdapter` to connect your backend:

```typescript
import type { DatafeedAdapter, Bar, SymbolInfo } from 'velo-plot/trading'

const myFeed: DatafeedAdapter = {
  async resolveSymbol(symbol) {
    return { symbol, name: symbol, timezone: 'UTC', session: '24x7' }
  },
  async getBars({ symbol, resolution, from, to }) {
    const response = await fetch(`/api/bars?symbol=${symbol}&from=${from}&to=${to}`)
    return response.json() as Promise<Bar[]>
  },
  subscribeBars({ symbol, onBar }) {
    const ws = new WebSocket(`wss://api.example.com/stream/${symbol}`)
    ws.onmessage = (e) => onBar(JSON.parse(e.data))
    return () => ws.close()
  },
}
```

## Related

- [API: Datafeed](/api/datafeed)
- [Real-time Streaming](./realtime.md)
- [Trading Dashboard](./trading-dashboard.md)
