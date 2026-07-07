# Trading Indicators (addIndicator)

One-liner presets for RSI, MACD, Bollinger, EMA, SMA, and Stochastic.

<script setup>
import TradingIndicatorsDemo from '../../.vitepress/theme/demos/trading/TradingIndicatorsDemo.vue'
</script>

<TradingIndicatorsDemo />

## Code

```typescript
await stack.addIndicator('rsi', { period: 14, pane: 'new' })
await stack.addIndicator('macd', { pane: 'new' })
await stack.addIndicator('stochastic', { period: 14, pane: 'new' })
await stack.addIndicator('bollinger', { period: 20, sourceSeriesId: 'ohlc' })
```

## Related

- [API: addIndicator](/api/trading-indicators)
- [Trading overview](./)
