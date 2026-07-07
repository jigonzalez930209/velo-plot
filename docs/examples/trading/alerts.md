# Price Alerts

Fire events when price crosses above, below, or through a level.

<script setup>
import TradingAlertsDemo from '../../.vitepress/theme/demos/trading/TradingAlertsDemo.vue'
</script>

<TradingAlertsDemo />

## Code

```typescript
chart.on('alert', (e) => console.log(e))
chart.addAlert({ price: 105, direction: 'above' })
```

## Related

- [API: Alerts & Markers](/api/trading-alerts)
- [Markers & positions](./markers-positions)
