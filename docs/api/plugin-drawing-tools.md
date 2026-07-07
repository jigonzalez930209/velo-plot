---
title: PluginDrawingTools
description: Interactive trendline, horizontal, vertical, rectangle, and Fibonacci drawing with undo/redo.
---

# PluginDrawingTools

Interactive drawing tools for trading charts (Stage 2.9). Pair with `PluginKeyboard` for Ctrl+Z / Ctrl+Y undo.

## Setup

```typescript
import { createChart, PluginDrawingTools, PluginKeyboard } from 'velo-plot/trading'

const chart = createChart({ container })
await chart.use(PluginDrawingTools({ color: '#38bdf8' }))
await chart.use(PluginKeyboard())

chart.setDrawingMode('trendline')
```

## Drawing modes

| Mode | Interaction |
|------|-------------|
| `'none'` | Disable drawing |
| `'pan'` | Pan mode |
| `'trendline'` | Two clicks → diagonal line |
| `'horizontal'` | One click → horizontal line |
| `'vertical'` | One click → vertical line |
| `'rectangle'` | Two clicks → rectangle |
| `'fibonacci'` | Two clicks → retracement levels (0, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%) |

```typescript
chart.setDrawingMode('fibonacci')
```

## Plugin API

```typescript
const drawing = chart.getPlugin('velo-plot-drawing-tools')

drawing?.setMode('horizontal')
drawing?.getMode()  // 'horizontal'
drawing?.undo()
drawing?.redo()
drawing?.clear()
```

## Undo / redo

- **Plugin API**: `drawing.undo()` / `drawing.redo()`
- **Keyboard**: `PluginKeyboard` binds Ctrl+Z / Ctrl+Y (Cmd on macOS)

Drawings are stored as chart annotations and can be serialized via [State Persistence](/api/persistence).

## Related

- [Drawing Tools example](/examples/trading-drawing-tools)
- [Annotations API](/api/annotations)
