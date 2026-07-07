# Hollow Candles

Hollow candlestick style — bullish candles render as outlines when `close >= open`.

<script setup>
import TradingHollowCandlesDemo from '../../.vitepress/theme/demos/trading/TradingHollowCandlesDemo.vue'
</script>

<TradingHollowCandlesDemo />

## Code

```typescript
chart.addSeries({
  id: 'ohlc',
  type: 'candlestick',
  data: ohlc,
  style: { hollow: true, bullishColor: '#22c55e', bearishColor: '#ef4444' },
})
```

## Related

- [Heikin-Ashi](./heikin-ashi)
- [API: Candlestick](/api/candlestick)
