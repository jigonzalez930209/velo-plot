# Bar Replay

Step through historical bars one at a time.

<script setup>
import TradingReplayDemo from '../../.vitepress/theme/demos/trading/TradingReplayDemo.vue'
</script>

<TradingReplayDemo />

## Code

```typescript
import { PluginReplay } from 'velo-plot/trading'

await chart.use(PluginReplay({ seriesId: 'ohlc', frameMs: 150 }))
const replay = chart.getPlugin('velo-plot-replay')
replay?.play(2)
replay?.step(1)
replay?.pause()
```

## Related

- [API: PluginReplay](/api/plugin-replay)
- [Trading overview](./)
