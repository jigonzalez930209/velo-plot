# Price Alerts

Fire events when price crosses above, below, or through a level.

```typescript
import { createChart } from 'velo-plot/trading'

const chart = createChart({ container })
chart.addSeries({ id: 'ohlc', type: 'candlestick', data: ohlc })

const fired: unknown[] = []
chart.on('alert', (e) => fired.push(e))

const id = chart.addAlert({
  price: 105,
  direction: 'above',  // 'above' | 'below' | 'cross'
  seriesId: 'ohlc',
  once: true,
})

// Alerts evaluate on data updates
chart.updateSeries('ohlc', { close: updatedClose })

// Manage active alerts
console.log(chart.getAlerts())
chart.removeAlert(id)
chart.clearAlerts()
```

## Alert event payload

```typescript
interface AlertEvent {
  id: string
  price: number
  direction: 'above' | 'below' | 'cross'
  seriesId?: string
  triggeredAt: number
  triggerPrice: number
}
```

Alert levels render as dashed horizontal lines on the chart overlay.

## Related

- [API: Alerts & Markers](/api/trading-alerts)
- [Trade Markers & Positions](./trading-markers-positions.md)
- [Trading Dashboard](./trading-dashboard.md)
