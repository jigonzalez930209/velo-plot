# Trade Markers & Position Lines

Visualize entries, exits, and open positions on candlestick charts.

<script setup>
import TradingMarkersPositionsDemo from '../../.vitepress/theme/demos/trading/TradingMarkersPositionsDemo.vue'
</script>

<TradingMarkersPositionsDemo />

## Code

```typescript
chart.getSeries('ohlc')?.setMarkers([
  { time: ohlc.x[10], shape: 'arrowUp', position: 'belowBar', text: 'Buy' },
])

chart.addPositionLine({ price: 102, style: 'entry' })
chart.addPositionLine({ price: 98, style: 'sl' })
chart.addPositionLine({ price: 108, style: 'tp' })
```

## Related

- [API: Alerts & Markers](/api/trading-alerts)
- [Price alerts](./alerts)
