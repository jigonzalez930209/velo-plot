---
title: Multi-Pane Layouts
description: Guide to TradingView-style stacked charts with createStackedChart, sync, resize, and composite indicators.
---

# Multi-Pane Layouts

Velo Plot supports two approaches for dashboards with multiple related charts:

| Approach | Best for |
|----------|----------|
| **`createStackedChart`** | Vertical stacks (price + volume + indicators), 1–5 panes, shared time axis |
| **`createChartGroup`** | Side-by-side charts, custom DOM layout, full sync control |

## Recommended: createStackedChart

For TradingView-style layouts:

```typescript
import { createStackedChart, buildIndicatorPane } from 'velo-plot';

const stack = createStackedChart({
  container,
  masterPaneId: 'price',
  sharedXAxis: 'bottom',
  resizable: true,
  sync: true,
  panes: [
    { id: 'price', height: 0.42, series: [...] },
    { id: 'volume', height: 0.14, series: [...] },
    buildIndicatorPane({ id: 'wave', data: {...} }),
    { id: 'rsi', height: 0.2, yRange: [0, 100], series: [...] },
  ],
});

await stack.whenReady();
stack.fitAll();
```

### Design rules

1. **All panes interactive** — Every pane accepts pan/zoom by default; X syncs, Y stays independent.
2. **Never sync Y across units** — Price, volume, and RSI should keep separate Y scales (`sync: { axis: 'x' }`).
3. **Shared dates below** — `sharedXAxis: 'bottom'` shows timestamps once on the last pane.
4. **Fit after data** — Call `fitAll()` after series load, not `resetZoom()` on empty charts.
5. **Explicit container height** — Stack root needs a fixed height in CSS (e.g. `560px`).

### Interaction cheat sheet

| Pane type | Pan Y behavior |
|-----------|----------------|
| Candlestick / line / RSI | Full canvas moves |
| Volume (bars only) | Y anchored at 0; bar heights scale |
| Indicator (histogram + lines) | Full canvas moves |

### Sync presets

```typescript
// Default — any pane drives X
sync: true

// Classic master-slave
sync: { axis: 'x', bidirectional: false }

// Fully independent
sync: false

// Runtime
stack.setSyncAxis('xy');
```

### Pane resize

```typescript
resizable: {
  minPaneRatio: 1 / 6,
  dividerSize: 6,
}
```

Drag dividers between panes; layout commits on release without flicker.

## Composite indicators

Use `buildIndicatorPane` for histogram + buy/sell colored lines + fills:

```typescript
buildIndicatorPane({
  id: 'macd',
  data: {
    x,
    histogram: { y: hist },
    lines: [{
      id: 'macd',
      y: macdLine,
      colorZones: { ref: 'zero', aboveColor: '#26a69a', belowColor: '#ef5350' },
    }],
  },
});
```

See [Indicator Panes API](/api/indicator-panes).

## Manual sync with ChartGroup

When you control your own layout (grids, tabs, side panels):

```typescript
import { createChart, createChartGroup } from 'velo-plot';

const group = createChartGroup([chart1, chart2], {
  axis: 'x',
  bidirectional: true,
});

group.fitAll();
```

### chart.getId()

```typescript
console.log(chart.getId()); // 'price' if options.id was set
```

Always pass `id` when using groups.

## Safe fit: chart.fit()

`resetZoom()` delegates to `fit()` — it **does nothing** when series have no valid bounds.

```typescript
chart.fit({ x: [t0, t1], y: [0, 100], padding: 0.02 });
group.fitAll();
```

## Batch operations

```typescript
group.batch(() => {
  master.zoom({ x: [0, 1000], animate: false });
  slave.fit({ x: [0, 1000] });
});
```

## React integration

```tsx
import { useStackedPlot } from 'velo-plot/react';

const { containerRef, stack, isReady, fitAll } = useStackedPlot({
  masterPaneId: 'price',
  sync: true,
  resizable: true,
  panes: [...],
});
```

See [Multi-Pane Example](/examples/pane-stack), [Stacked Chart API](/api/stacked-chart), and [React Hooks](/api/react-hook).
