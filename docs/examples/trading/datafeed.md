# Mock Datafeed

Load historical and realtime OHLCV data via the UDF-inspired adapter.

<script setup>
import TradingDatafeedDemo from '../../.vitepress/theme/demos/trading/TradingDatafeedDemo.vue'
</script>

<TradingDatafeedDemo />

## Modes

| Mode | Behavior |
|------|----------|
| **Fixed window** | Keep a constant time span (~60 bars). New bars scroll the view so the latest stays on the right (`autoScroll`). |
| **Expand X** | Grow the X domain to fit all history (previous default). |

```typescript
import { createMockDatafeed, barsToOhlc } from 'velo-plot/trading'

const feed = createMockDatafeed({ seed: 42 })
const bars = await feed.getBars({ symbol: 'MOCK', resolution: '1', from, to })
const ohlc = barsToOhlc(bars)

// Fixed scrolling window
chart.setAutoScroll(true)
chart.updateXAxis({ auto: false })

chart.updateSeries('ohlc', { ...nextBar, append: true })
// → view keeps the same width and follows the latest candle
```

## Related

- [API: Datafeed](/api/datafeed)
- [Real-time streaming](/examples/realtime)
