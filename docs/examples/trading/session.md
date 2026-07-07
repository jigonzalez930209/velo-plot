# Trading Session Chart

Business-day time scale skips weekends on the X axis while keeping epoch timestamps in tooltips.

<script setup>
import TradingSessionDemo from '../../.vitepress/theme/demos/trading/TradingSessionDemo.vue'
</script>

<TradingSessionDemo />

## Code

```typescript
import { createStackedChart } from 'velo-plot/trading'

const stack = createStackedChart({
  container,
  panes: [/* price + volume */],
  xAxis: {
    type: 'time',
    timeScale: { calendar: 'business-day', session: '24x7' },
  },
})
```

## Session presets

| Preset | Description |
|--------|-------------|
| `24x7` | Weekends only (default MVP) |
| `NYSE` | Reserved for session-hour filtering |

## Related

- [API: Business-Day Time Scale](/api/trading-time-scale)
- [Trading overview](./)
