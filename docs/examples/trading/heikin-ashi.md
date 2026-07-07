# Heikin-Ashi Charts

Heikin-Ashi smooths candlestick noise by averaging OHLC values.

<script setup>
import TradingHeikinAshiDemo from '../../.vitepress/theme/demos/trading/TradingHeikinAshiDemo.vue'
</script>

<TradingHeikinAshiDemo />

## Code

```typescript
chart.addSeries({
  id: 'ha',
  type: 'heikin-ashi',
  data: { x: times, open, high, low, close },
})
```

## Related

- [API: Candlestick](/api/candlestick)
- [Hollow candles](./hollow-candles)
