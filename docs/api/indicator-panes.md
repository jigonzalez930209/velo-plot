---
title: Composite Indicator Panes
description: Build trading indicator panes with histograms, buy/sell line colors, fills, and markers for createStackedChart.
---

# Composite Indicator Panes

Render multi-layer trading indicators (histogram, lines, bands, markers) as native chart series. Use inside [`createStackedChart`](/api/stacked-chart) or any standalone `createChart` pane.

## Import

```typescript
import {
  buildIndicatorPane,
  buildIndicatorSeries,
  detectIndicatorMarkers,
  type IndicatorData,
  type IndicatorLineColorZones,
} from 'velo-plot';
```

## Quick Example (Stacked Pane)

```typescript
import { createStackedChart, buildIndicatorPane, detectIndicatorMarkers } from 'velo-plot';

const markers = detectIndicatorMarkers(x, fastLine, 4);

const wavePane = buildIndicatorPane({
  id: 'wave',
  height: 0.24,
  label: 'Wave',
  yRange: [-80, 80],
  tickCount: 5,
  data: {
    x,
    histogram: {
      y: histogram,
      positiveColor: '#26a69a',
      negativeColor: '#ef5350',
    },
    lines: [
      {
        id: 'fast',
        y: fastLine,
        width: 2,
        colorZones: {
          ref: 'slow',
          aboveColor: '#26a69a',  // buy / bullish
          belowColor: '#ef5350',  // sell / bearish
        },
      },
      { id: 'slow', y: slowLine, color: 'rgba(224, 64, 251, 0.55)', width: 1.5 },
    ],
    fills: [{
      upper: upperBand,
      lower: lowerBand,
      color: 'rgba(80, 60, 140, 0.35)',
    }],
    markers,
    referenceLines: [
      { y: 60, color: 'rgba(198, 40, 40, 0.45)' },
      { y: -60, color: 'rgba(38, 166, 154, 0.45)' },
    ],
  },
});

const stack = createStackedChart({
  container,
  masterPaneId: 'price',
  panes: [pricePane, volumePane, wavePane],
});
```

## buildIndicatorPane

Returns a `StackedPaneConfig` ready for `createStackedChart`.

### High-level presets (Stage 2)

```typescript
import { createChart, buildIndicatorPaneFromPreset } from 'velo-plot';

// Single chart — overlay or inline layers
await chart.addIndicator('bollinger', { period: 20, sourceSeriesId: 'candles' });
await chart.addIndicator('rsi', { period: 14, id: 'rsi' });

// Stacked chart — build pane at creation time
const rsiPane = await buildIndicatorPaneFromPreset('rsi', x, closePrices, {
  id: 'rsi',
  label: 'RSI (14)',
  height: 0.24,
});

const stack = createStackedChart({
  container,
  panes: [pricePane, volumePane, rsiPane],
});
```

| Preset | Placement | Notes |
|--------|-----------|-------|
| `rsi` | oscillator pane | Reference lines at 70 / 30 |
| `macd` | oscillator pane | Histogram + MACD + signal |
| `bollinger` | price overlay | Band fill + middle line |
| `ema`, `sma` | price overlay | Single line on source series Y axis |

Calculations use the Stage 1 worker pool when available (`indicatorsAsync`).

```typescript
function buildIndicatorPane(options: BuildIndicatorPaneOptions): StackedPaneConfig
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | **required** | Pane id |
| `data` | `IndicatorData` | **required** | Composite indicator payload |
| `height` | `number \| string` | `0.25` | Flex ratio inside stack |
| `label` | `string` | `'Indicator'` | Y-axis label |
| `yRange` | `[number, number] \| 'auto'` | `'auto'` | Lock Y range for oscillators |
| `tickCount` | `number` | `5` | Y-axis tick count |
| `showXAxis` | `boolean` | — | Override X axis visibility |
| `style` | `IndicatorStyle` | — | Baseline and marker styling |
| `seriesId` | `string` | `{id}-indicator` | Root id for expanded series |

## buildIndicatorSeries

Lower-level expansion into native `SeriesOptions[]` (bar, line, band, scatter):

```typescript
function buildIndicatorSeries(options: IndicatorSeriesOptions): SeriesOptions[]
```

Use when adding indicators to an existing chart:

```typescript
const series = buildIndicatorSeries({
  id: 'macd',
  type: 'indicator',
  data: {
    x,
    histogram: { y: macdHist },
    lines: [{ y: signalLine, color: '#ff9800' }],
  },
});

for (const s of series) chart.addSeries(s);
```

## IndicatorData Layers

| Layer | Renders as | Description |
|-------|------------|-------------|
| `histogram` | 2 bar series (pos/neg) | Signed histogram split at zero |
| `lines` | line series | One or more indicator lines |
| `fills` | band series | Upper/lower envelope shading |
| `markers` | scatter series | Peak/trough markers |
| `baseline` | dashed line | Reference at Y (default `0`) |
| `referenceLines` | horizontal lines | Fixed Y levels (overbought, etc.) |

### Histogram

```typescript
histogram: {
  y: Float32Array,           // signed values
  positiveColor?: string,    // default '#26a69a'
  negativeColor?: string,    // default '#ef5350'
  opacity?: number,
  barWidth?: number,         // omit for time-axis auto width
}
```

### Lines with Buy/Sell Colors (`colorZones`)

Split one logical line into colored segments at crossings with a reference:

```typescript
lines: [{
  id: 'fast',
  y: fastLine,
  width: 2,
  colorZones: {
    ref: 'zero',              // 'zero' | number | another line id
    aboveColor: '#26a69a',
    belowColor: '#ef5350',
  },
}]
```

| `ref` value | Meaning |
|-------------|---------|
| `'zero'` or omitted | Compare against Y = 0 |
| `number` | Constant threshold (e.g. `60` for RSI) |
| `string` | Id of another line in the same `lines` array |

Example — color relative to a signal line:

```typescript
{ id: 'signal', y: slowLine, color: '#888', width: 1.5 },
{
  id: 'fast',
  y: fastLine,
  colorZones: { ref: 'signal', aboveColor: '#00e5ff', belowColor: '#e040fb' },
}
```

### Fills

```typescript
fills: [{
  upper: Float32Array,
  lower: Float32Array,
  color?: string,
  opacity?: number,
}]
```

### Markers

```typescript
// Manual
markers: [{ x: 100, y: 42, kind: 'peak' }, { x: 200, y: -30, kind: 'trough' }]

// Auto-detect local extrema
import { detectIndicatorMarkers } from 'velo-plot';
const markers = detectIndicatorMarkers(x, y, 3); // window = 3
```

## Navigation Notes

Indicator panes with **histogram + lines** use free Y pan/zoom (full canvas movement). Pure bar panes (volume) keep Y anchored at zero. See [Stacked Chart — Interaction](/api/stacked-chart#interaction-navigation).

## Related

- [Pane Stack Example](/examples/pane-stack)
- [Stacked Chart API](/api/stacked-chart)
- [Financial Indicators](/api/indicators) — SMA, RSI, MACD calculation functions
