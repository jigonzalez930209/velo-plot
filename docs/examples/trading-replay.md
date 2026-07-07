# Bar Replay

Step through historical bars one at a time — useful for backtesting review and education.

```typescript
import { createChart, PluginReplay } from 'velo-plot/trading'

const chart = createChart({ container })
chart.addSeries({ id: 'ohlc', type: 'candlestick', data: ohlc })

await chart.use(PluginReplay({ seriesId: 'ohlc', frameMs: 150 }))

const replay = chart.getPlugin('velo-plot-replay')

// Controls
replay?.seek(0)       // start from bar 0
replay?.step(5)       // advance 5 bars
replay?.play(2)       // auto-play at 2× speed
replay?.pause()
replay?.reset()       // show full history

console.log(replay?.getIndex(), '/', replay?.getLength())
```

During replay, only bars up to the current index are visible on the chart.

## UI integration

Wire replay controls to buttons:

```typescript
document.getElementById('play')?.addEventListener('click', () => replay?.play(1))
document.getElementById('pause')?.addEventListener('click', () => replay?.pause())
document.getElementById('step')?.addEventListener('click', () => replay?.step(1))
```

## Related

- [API: PluginReplay](/api/plugin-replay)
- [Trading Dashboard](./trading-dashboard.md)
