---
title: Multi-Pane Stack (Price / Volume / RSI)
description: TradingView-style stacked panes — sync presets, drag resize, composite indicators with buy/sell line colors.
---

<script setup>
import PaneStackDemo from '../.vitepress/theme/demos/PaneStackDemo.vue'
</script>

# Multi-Pane Stack

Stack up to **5 charts vertically** with a single API. Each pane supports any series type — candlesticks, bars, lines, composite indicators — with configurable axis sync and independent Y scales.

<PaneStackDemo />

## Demo Presets

Use the tabs above the chart to explore capabilities:

| Preset | What it demonstrates |
|--------|---------------------|
| **TradingView** | 4 panes, X sync, Y independent, wave indicator with buy/sell colors, drag resize |
| **Horizontal** | Side-by-side panes, Y sync, per-pane X axes, stack export buttons |
| **Price + Volume** | Minimal 2-pane stack |
| **No sync** | Fully independent panes |
| **XY sync** | Both axes linked between two line panes |
| **Y sync only** | Y-axis propagation only |
| **Master only** | Classic master-slave — only price drives X |

The TradingView preset includes a **runtime sync selector** (X / Y / XY / none) and cursor toggle.

## Interaction Model

| Action | X (time) | Y (value) |
|--------|----------|-----------|
| Pan/zoom on any pane | Synced (default) | Local to that pane |
| Wheel on plot area | X syncs; Y changes on active pane | Local |
| Wheel on Y-axis strip | — | That pane only |
| Drag Y-axis strip | — | Pan that pane’s Y only |

- **Volume pane**: bars stay on baseline Y=0 (volume-style).
- **Indicator pane** (histogram + lines): full canvas pan/zoom like a line chart.
- **All panes** are interactive by default.

## Why createStackedChart?

Before stacked API, Price / Volume / RSI required:

- Multiple `createChart` containers
- Manual `ChartGroup` wiring
- CSS clipping for duplicate X labels
- Custom fit logic and resize handling

`createStackedChart` handles margins, sync, resize, and fit natively.

## Full Implementation

```typescript
import { createStackedChart, buildIndicatorPane, detectIndicatorMarkers } from 'velo-plot';

const markers = detectIndicatorMarkers(x, wt1, 4);

const wavePane = buildIndicatorPane({
  id: 'wave',
  height: 0.24,
  label: 'Wave',
  yRange: [-80, 80],
  data: {
    x,
    histogram: {
      y: hist,
      positiveColor: '#26a69a',
      negativeColor: '#ef5350',
    },
    lines: [
      {
        id: 'wt1',
        y: wt1,
        width: 2,
        colorZones: {
          ref: 'wt2',
          aboveColor: '#26a69a',
          belowColor: '#ef5350',
        },
      },
      { id: 'wt2', y: wt2, color: 'rgba(224, 64, 251, 0.55)', width: 1.5 },
    ],
    fills: [{ upper, lower, color: 'rgba(80, 60, 140, 0.35)' }],
    markers,
  },
});

const stack = createStackedChart({
  container: document.getElementById('chart-root') as HTMLDivElement,
  masterPaneId: 'price',
  sharedXAxis: 'bottom',
  resizable: true,
  sync: true,
  showLegend: false,
  theme: 'midnight',
  devicePixelRatio: window.devicePixelRatio,
  panes: [
    {
      id: 'price',
      height: 0.42,
      chart: {
        xAxis: { type: 'time', showLabels: false, showTicks: false },
        yAxis: { label: 'Price', tickCount: 5 },
      },
      series: [{
        id: 'ohlc',
        type: 'candlestick',
        data: { x, open, high, low, close },
        style: { bullishColor: '#26a69a', bearishColor: '#ef5350' },
      }],
    },
    {
      id: 'volume',
      height: 0.14,
      chart: { yAxis: { label: 'Volume', prefix: 'M', tickCount: 4 } },
      series: [{
        id: 'vol',
        type: 'bar',
        data: { x, y: volume },
        style: { color: 'rgba(100, 181, 246, 0.7)' },
      }],
    },
    wavePane,
    {
      id: 'rsi',
      height: 0.2,
      yRange: [0, 100],
      chart: {
        yAxis: { label: 'RSI', min: 0, max: 100, auto: false, tickCount: 5 },
        xAxis: { type: 'time', label: 'Date', tickCount: 6 },
      },
      series: [{
        id: 'rsi-line',
        type: 'line',
        data: { x, y: rsi },
        style: { color: '#ab47bc', width: 1.5 },
      }],
    },
  ],
});

await stack.whenReady();
stack.fitAll();
```

## Sync Options

```typescript
createStackedChart({
  sync: true, // default: axis 'x', bidirectional, any pane drives X

  sync: {
    axis: 'x',
    bidirectional: true,
    syncCursor: true,
    syncZoom: true,
    syncPan: true,
  },

  sync: false, // independent panes

  sync: { axis: 'x', bidirectional: false }, // master-slave
});

stack.setSyncAxis('none');
stack.setSyncOptions({ syncCursor: false });
stack.getGroup().updateOptions({ axis: 'xy' });
```

## Stack export (PNG / JPEG / WebP)

Use the **Export stack** buttons in the demo toolbar, or call the API after `whenReady()`:

```typescript
await stack.whenReady();

// Data URL
const png = await stack.exportImage({ format: 'png', resolution: '4k' });

// Browser download
await stack.snapshot({
  format: 'jpeg',
  quality: 0.9,
  download: true,
  fileName: 'market-stack',
  includeDividers: true,
});
```

Supported stack formats: **PNG**, **JPEG**, **WebP**. Full-stack SVG is not yet available — export individual panes with `stack.getPane('price')?.exportSVG()`.

See [Image & Vector Export](/api/image-export#multi-pane-stack-export) for all options.

## Drag Resize

```typescript
resizable: true,
// or
resizable: {
  minPaneRatio: 1 / 6,
  minPanePx: 48,
  dividerSize: 6,
},
```

## Pane Height Ratios

| `height` | Meaning |
|----------|---------|
| `0.55` | 55% flex ratio |
| `'80px'` | Fixed minimum |
| `'30%'` | 30% flex basis |

## React

```tsx
import { useEffect } from 'react';
import { useStackedPlot } from 'velo-plot/react';

function MarketStack() {
  const { containerRef, isReady, fitAll } = useStackedPlot({
    masterPaneId: 'price',
    sharedXAxis: 'bottom',
    resizable: true,
    sync: true,
    panes: [/* ... */],
  });

  useEffect(() => {
    if (isReady) fitAll();
  }, [isReady, fitAll]);

  return <div ref={containerRef} style={{ height: 560 }} />;
}
```

## Controls

```typescript
stack.getPane('volume')?.updateSeries('vol', { x: newX, y: newY });
stack.getPaneRatios();
stack.setPaneRatios({ price: 0.5, volume: 0.15, wave: 0.2, rsi: 0.15 });
stack.getGroup().syncTo({ xMin, xMax });
stack.destroy();
```

## Container Height (Required)

```html
<div id="chart-root" style="height: 560px"></div>
```

## Time-Axis Candlesticks

Do **not** set `barWidth: 0.7` with epoch millisecond X values. Omit `barWidth` for auto spacing.

## See Also

- [Stacked Chart API](/api/stacked-chart)
- [Image & Vector Export](/api/image-export)
- [Indicator Panes API](/api/indicator-panes)
- [Chart Sync](/api/chart-sync)
- [Multi-Pane Guide](/guide/multi-pane)
