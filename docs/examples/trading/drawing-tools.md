# Drawing Tools

Interactive trendlines, horizontal lines, rectangles, Fibonacci retracements, the measure tool, and undo/redo.

<script setup>
import TradingDrawingToolsDemo from '../../.vitepress/theme/demos/trading/TradingDrawingToolsDemo.vue'
</script>

<TradingDrawingToolsDemo />

## Code

```typescript
import { PluginDrawingTools, PluginKeyboard } from 'velo-plot/trading'

await chart.use(PluginDrawingTools({
  color: '#38bdf8',
  magnet: true, // snap points to candle O/H/L/C
}))
await chart.use(PluginKeyboard())
chart.setDrawingMode('fibonacci')
```

## Measure tool

Drag between two prices to measure the range. The box is **green** when price rises and **red** when
it falls, with a label showing the absolute change, percentage change, and number of bars spanned.

```typescript
await chart.use(PluginDrawingTools({
  magnet: true,
  measureUpColor: '#26a69a',   // optional, default green
  measureDownColor: '#ef5350', // optional, default red
}))

chart.setDrawingMode('measure')
```

## Related

- [API: PluginDrawingTools](/api/plugin-drawing-tools)
- [Trading overview](./)
