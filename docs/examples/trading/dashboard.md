# Trading Dashboard

Full multi-pane trading layout: price, volume, RSI, and MACD — the Stage 2 reference example.

<script setup>
import TradingDashboardDemo from '../../.vitepress/theme/demos/trading/TradingDashboardDemo.vue'
</script>

<TradingDashboardDemo />

## Code

```typescript
import {
  createStackedChart,
  PluginDrawingTools,
  PluginReplay,
  PluginKeyboard,
} from 'velo-plot/trading'

const stack = createStackedChart({
  container: document.getElementById('chart'),
  panes: [
    {
      id: 'price',
      series: [{ id: 'ohlc', type: 'candlestick', data: ohlc }],
    },
    {
      id: 'volume',
      height: 0.18,
      series: [{ id: 'vol', type: 'bar', data: { x: ohlc.x, y: volume } }],
    },
  ],
  xAxis: {
    type: 'time',
    timeScale: { calendar: 'business-day', session: '24x7' },
  },
})

const priceChart = stack.getChart('price')

await stack.addIndicator('rsi', { period: 14, pane: 'new' })
await stack.addIndicator('macd', { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, pane: 'new' })

priceChart.getSeries('ohlc')?.setMarkers([
  { time: ohlc.x[10], shape: 'arrowUp', position: 'belowBar', text: 'Buy' },
])

priceChart.addPositionLine({ price: 102, style: 'entry' })
await priceChart.use(PluginDrawingTools())
await priceChart.use(PluginReplay({ seriesId: 'ohlc' }))
```

## Related

See the [Trading overview](./) for all Stage 2 examples and API links.
