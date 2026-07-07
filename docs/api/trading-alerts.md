---
title: Alerts, Markers & Position Lines
description: Price alerts, trade markers on candlesticks, and entry/SL/TP position lines.
---

# Alerts, Markers & Position Lines

Stage 2 adds trade visualization and price alert APIs on `Chart`.

## Trade markers

Markers render buy/sell arrows on candlestick series:

```typescript
const series = chart.getSeries('ohlc')
series?.setMarkers([
  {
    time: ohlc.x[10],       // epoch ms or logical index
    shape: 'arrowUp',       // 'arrowUp' | 'arrowDown' | 'circle' | 'square'
    position: 'belowBar',   // 'belowBar' | 'aboveBar' | 'inBar'
    text: 'Buy',
    color: '#22c55e',
  },
])
```

Types: `CandlestickMarker`, `CandlestickMarkerShape`, `CandlestickMarkerPosition` — exported from `velo-plot/trading`.

## Position lines

Horizontal price lines for entry, stop-loss, and take-profit:

```typescript
chart.addPositionLine({ price: 102, style: 'entry' })
chart.addPositionLine({ price: 98, style: 'sl' })
chart.addPositionLine({ price: 108, style: 'tp' })

// Custom
chart.addPositionLine({
  price: 105,
  label: 'Target',
  color: '#f59e0b',
  interactive: true,
})
```

`style` presets: `'entry'` (blue), `'sl'` (red), `'tp'` (green). Requires `PluginAnnotations` for overlay rendering when used standalone.

## Price alerts

```typescript
chart.on('alert', (e) => {
  // { id, price, direction, seriesId?, triggeredAt, triggerPrice }
  console.log('Alert fired:', e)
})

const id = chart.addAlert({
  price: 100,
  direction: 'above',  // 'above' | 'below' | 'cross'
  seriesId: 'ohlc',    // optional — default first series
  once: true,          // remove after first trigger (default)
})

chart.getAlerts()      // active alerts
chart.removeAlert(id)
chart.clearAlerts()
```

Alerts evaluate on `updateSeries` / streaming updates. Alert levels render as dashed horizontal lines on the chart overlay.

## Related

- [Trade Markers & Positions example](/examples/trading/markers-positions)
- [Price Alerts example](/examples/trading/alerts)
- [Candlestick API](/api/candlestick)
