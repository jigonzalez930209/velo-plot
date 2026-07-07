---
title: PluginReplay
description: Bar-by-bar playback with play, pause, step, and seek controls.
---

# PluginReplay

Bar-by-bar replay for candlestick or line series (Stage 2.17 MVP).

## Setup

```typescript
import { createChart, PluginReplay } from 'velo-plot/trading'

const chart = createChart({ container })
chart.addSeries({ id: 'ohlc', type: 'candlestick', data: ohlc })

await chart.use(PluginReplay({ seriesId: 'ohlc', frameMs: 100 }))
const replay = chart.getPlugin('velo-plot-replay')
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `seriesId` | `string` | **required** | Series to replay |
| `frameMs` | `number` | `200` | Milliseconds between bars during playback |

## Replay API

```typescript
const api = chart.getPlugin('velo-plot-replay')

api.getLength()   // total bars in buffer
api.getIndex()    // current visible bar index
api.seek(10)      // jump to bar index
api.step(1)       // advance N bars
api.play(2)       // auto-play at speed multiplier
api.pause()
api.reset()       // show all bars
```

During replay, only bars up to the current index are visible. Useful for backtesting visualization and education.

## Related

- [Replay example](/examples/trading/replay)
- [Trading Dashboard](/examples/trading/dashboard)
