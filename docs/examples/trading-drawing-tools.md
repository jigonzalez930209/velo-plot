# Drawing Tools

Interactive trendlines, horizontal/vertical lines, rectangles, Fibonacci retracements, and undo/redo.

```typescript
import {
  createChart,
  PluginDrawingTools,
  PluginKeyboard,
  PluginAnnotations,
} from 'velo-plot/trading'

const chart = createChart({ container })
chart.addSeries({ id: 'price', type: 'candlestick', data: ohlc })

await chart.use(PluginAnnotations())
await chart.use(PluginDrawingTools({ color: '#38bdf8' }))
await chart.use(PluginKeyboard())

// Set active drawing mode
chart.setDrawingMode('trendline')
// Other modes: 'horizontal' | 'vertical' | 'rectangle' | 'fibonacci' | 'none'
```

## Fibonacci retracement

```typescript
chart.setDrawingMode('fibonacci')
// Click two price points on the chart — levels 0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100% are drawn
```

## Undo / redo

```typescript
const drawing = chart.getPlugin('velo-plot-drawing-tools')

drawing?.undo()
drawing?.redo()
drawing?.clear()

// Or use Ctrl+Z / Ctrl+Y via PluginKeyboard
```

## Programmatic annotations

You can also add drawings without the plugin:

```typescript
chart.addAnnotation({ type: 'horizontal-line', y: 100, color: '#38bdf8', label: 'Support' })
chart.addAnnotation({ type: 'trendline', x1: 0, y1: 90, x2: 50, y2: 110, color: '#f59e0b' })
```

## Related

- [API: PluginDrawingTools](/api/plugin-drawing-tools)
- [Annotations](./annotations.md)
- [Trading Dashboard](./trading-dashboard.md)
