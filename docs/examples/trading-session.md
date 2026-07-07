# Trading Session Chart

Business-day time scale skips weekends on the X axis while keeping epoch timestamps in tooltips.

<script setup>
import { ref } from 'vue'
</script>

## Demo

Use a stacked price + volume layout with `xAxis.timeScale` set to business-day mode.

```typescript
import { createStackedChart } from 'velo-plot/trading'

const MS_DAY = 86_400_000
const n = 30
const times = new Float64Array(n)
const open = new Float32Array(n)
const high = new Float32Array(n)
const low = new Float32Array(n)
const close = new Float32Array(n)
const volume = new Float32Array(n)

let t = Date.UTC(2024, 0, 2) // Tuesday
let price = 100
for (let i = 0; i < n; i++) {
  while (new Date(t).getUTCDay() === 0 || new Date(t).getUTCDay() === 6) {
    t += MS_DAY
  }
  times[i] = t
  open[i] = price
  close[i] = price + (Math.random() - 0.5) * 2
  high[i] = Math.max(open[i], close[i]) + Math.random()
  low[i] = Math.min(open[i], close[i]) - Math.random()
  volume[i] = 1000 + Math.random() * 5000
  price = close[i]
  t += MS_DAY
}

const stack = createStackedChart({
  container: document.getElementById('chart'),
  panes: [
    {
      id: 'price',
      series: [{
        id: 'ohlc',
        type: 'candlestick',
        data: { x: times, open, high, low, close },
      }],
    },
    {
      id: 'volume',
      height: 0.2,
      series: [{
        id: 'vol',
        type: 'bar',
        data: { x: times, y: volume },
        style: { color: 'rgba(56, 189, 248, 0.6)' },
      }],
    },
  ],
  xAxis: {
    type: 'time',
    timeScale: { calendar: 'business-day', session: '24x7' },
  },
})

await stack.addIndicator('rsi', { period: 14, pane: 'new' })
```

## How it works

- `timeScale.calendar: 'business-day'` maps timestamps to consecutive indices (Sat/Sun bars are hidden).
- Axis tick labels still show calendar dates via the internal `timeByIndex` mapping.
- Use `calendar: 'continuous'` to keep the legacy epoch-ms X axis.

## Session presets

| Preset | Description |
|--------|-------------|
| `24x7` | Weekends only (default MVP) |
| `NYSE` | Reserved for session-hour filtering (timezone-aware) |
