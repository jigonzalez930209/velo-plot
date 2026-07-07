# Mock Datafeed

Load historical and realtime OHLCV data via the UDF-inspired adapter.

<script setup>
import TradingDatafeedDemo from '../../.vitepress/theme/demos/trading/TradingDatafeedDemo.vue'
</script>

<TradingDatafeedDemo />

## Code

```typescript
import { createMockDatafeed, barsToOhlc } from 'velo-plot/trading'

const feed = createMockDatafeed({ seed: 42 })
const bars = await feed.getBars({ symbol: 'MOCK', resolution: '1', from, to })
const ohlc = barsToOhlc(bars)
```

## Related

- [API: Datafeed](/api/datafeed)
- [Real-time streaming](/examples/realtime)
