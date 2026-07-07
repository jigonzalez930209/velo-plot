---
title: Datafeed Adapter
description: UDF-inspired contract for historical bars and realtime subscriptions.
---

# Datafeed Adapter

Stage 2.24 defines a TradingView UDF-style adapter for loading OHLCV data into velo-plot charts.

## Interface

```typescript
import type {
  DatafeedAdapter,
  SymbolInfo,
  Bar,
  HistoryRequest,
} from 'velo-plot/trading'

interface DatafeedAdapter {
  resolveSymbol(symbol: string): Promise<SymbolInfo>
  getBars(request: HistoryRequest): Promise<Bar[]>
  subscribeBars(request: SubscribeBarsRequest): () => void
}
```

### Types

```typescript
interface SymbolInfo {
  symbol: string
  name: string
  description?: string
  timezone?: string
  session?: string
  pricescale?: number
  minmov?: number
}

interface Bar {
  time: number   // epoch ms
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface HistoryRequest {
  symbol: string
  resolution: string  // e.g. '1', '5', 'D'
  from: number        // epoch ms
  to: number
}
```

## Mock datafeed

```typescript
import { createMockDatafeed, barsToOhlc } from 'velo-plot/trading'

const feed = createMockDatafeed({ seed: 42 })

const info = await feed.resolveSymbol('MOCK')
const bars = await feed.getBars({
  symbol: 'MOCK',
  resolution: '1',
  from: Date.UTC(2024, 0, 1),
  to: Date.UTC(2024, 1, 1),
})

const ohlc = barsToOhlc(bars)
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

// later
unsubscribe()
```

## Related

- [Datafeed example](/examples/trading/datafeed)
- [Real-time Streaming](/api/plugin-streaming)
