---
title: Stacked Pane Charts (createStackedChart)
description: TradingView-style multi-pane layouts with X sync, independent Y scales, drag resize, and composite indicator panes.
---

# Stacked Pane Charts

`createStackedChart` coordinates **1–5 charts stacked vertically** in a single container. Each pane is a full `Chart` instance — candlesticks, bars, lines, composite indicators — with optional shared time-axis sync and aligned margins.

Use this instead of manually wiring multiple `createChart` calls, `ChartGroup`, hidden X axes, resize logic, and fit coordination.

## Import

```typescript
import {
  createStackedChart,
  STACKED_MAX_PANES,
  STACKED_DEFAULT_MIN_PANE_RATIO,
} from 'velo-plot';
```

## Quick Example

```typescript
import { createStackedChart } from 'velo-plot';

const stack = createStackedChart({
  container: document.getElementById('market') as HTMLDivElement,
  masterPaneId: 'price',
  sharedXAxis: 'bottom',
  resizable: true,
  sync: true,
  theme: 'midnight',
  devicePixelRatio: window.devicePixelRatio,
  panes: [
    {
      id: 'price',
      height: 0.42,
      chart: {
        xAxis: { type: 'time', showLabels: false, showTicks: false },
        yAxis: { label: 'Price', scientific: false },
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
      chart: { yAxis: { label: 'Volume', prefix: 'M' } },
      series: [{
        id: 'vol',
        type: 'bar',
        data: { x, y: volume },
        style: { color: 'rgba(100, 181, 246, 0.7)' },
      }],
    },
    {
      id: 'rsi',
      height: 0.2,
      yRange: [0, 100],
      chart: { yAxis: { label: 'RSI', auto: false, min: 0, max: 100 } },
      series: [{
        id: 'rsi',
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

## Options

### StackedChartOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `container` | `HTMLDivElement` | **required** | Root element (cleared and filled with pane layout) |
| `panes` | `StackedPaneConfig[]` | **required** | 1–5 pane definitions, top to bottom |
| `masterPaneId` | `string` | first pane `id` | Pane used by `fitAll()` to derive shared X |
| `sharedXAxis` | `'bottom' \| 'none'` | `'bottom'` | Hide X axis on upper panes; dates only on bottom |
| `sync` | `boolean \| StackedSyncOptions` | `true` | Pan/zoom sync between panes (see below) |
| `resizable` | `boolean \| ResizableOptions` | `false` | VS Code–style drag dividers between panes |
| `theme` | `string \| ChartTheme` | — | Applied to all panes unless overridden |
| `devicePixelRatio` | `number` | `window.devicePixelRatio` | Sharp rendering on HiDPI displays |
| `gap` | `number` | `0` | Vertical gap between panes (px) |
| `showLegend` | `boolean` | `false` | Show legend on panes |
| `layout` | `Partial<LayoutOptions>` | — | Shared margin overrides |

#### ResizableOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `minPaneRatio` | `number` | `1/6` (`STACKED_DEFAULT_MIN_PANE_RATIO`) | Min pane height as fraction of stack |
| `minPanePx` | `number` | — | Absolute min height (px) when larger than ratio |
| `dividerSize` | `number` | `6` | Divider hit area height (px) |

```typescript
resizable: {
  minPaneRatio: 1 / 6,
  dividerSize: 6,
}
```

#### StackedSyncOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `axis` | `'x' \| 'y' \| 'xy' \| 'none'` | `'x'` | Which axes propagate between panes |
| `bidirectional` | `boolean` | `true` | Any pane can drive sync (not only master) |
| `syncCursor` | `boolean` | `true` | Share crosshair across panes |
| `syncZoom` | `boolean` | `true` | Propagate zoom events |
| `syncPan` | `boolean` | `true` | Propagate pan events |
| `syncSelection` | `boolean` | `false` | Share point selection |
| `debounce` | `number` | `0` | Debounce sync (ms); `0` uses rAF batching |

Pass `sync: false` for fully independent panes.

### StackedPaneConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | **required** | Stable pane id (also chart `id` for sync) |
| `height` | `number \| string` | **required** | Flex ratio (`0.55`) or CSS length (`'24%'`, `'80px'`) |
| `chart` | `Omit<ChartOptions, 'container' \| 'id'>` | — | Per-pane chart options |
| `series` | `SeriesOptions[]` | — | Series added after chart creation |
| `showXAxis` | `boolean` | bottom pane only | Show native X axis on this pane |
| `interactive` | `boolean` | `true` | Enable pan/zoom on this pane |
| `yRange` | `[number, number] \| 'auto'` | `'auto'` | Lock Y range (e.g. RSI 0–100) |

## StackedChart API

```typescript
interface StackedChart {
  readonly container: HTMLDivElement;

  getPane(id: string): Chart | undefined;
  getPanes(): Chart[];
  getMaster(): Chart;
  getGroup(): ChartGroup;

  fitAll(options?: { x?: Range; padding?: number }): void;
  resetAll(): void;
  resize(): void;

  getPaneRatios(): Record<string, number>;
  setPaneRatios(ratios: Record<string, number>): void;

  setSyncAxis(axis: SyncAxis): void;
  getSyncAxis(): SyncAxis;
  setSyncOptions(options: Partial<StackedSyncOptions>): void;

  whenReady(): Promise<void>;
  destroy(): void;
}
```

### fitAll / resetAll

- **`fitAll()`** — Master pane fits X from its data; all panes share that X range; each pane fits its own Y independently.
- **`resetAll()`** — Re-fits every pane from current series data (safe — skips empty panes).

Both run inside `ChartGroup.batch()` so sync events do not corrupt bounds during initialization.

### Runtime sync

```typescript
stack.setSyncAxis('none');
stack.setSyncOptions({ syncCursor: false });
stack.getGroup().updateOptions({ axis: 'xy', bidirectional: true });
```

## Interaction & Navigation

### Default behavior (`sync: true`, `axis: 'x'`)

| Action | X (time) | Y (value) |
|--------|----------|-----------|
| Pan/zoom on **any** pane | Synced across panes | Local to that pane |
| Wheel on **plot area** | Zoom X + Y on that pane; X propagates | Local Y change |
| Wheel on **Y-axis strip** | — | Zoom that pane’s Y only |
| Drag on **Y-axis strip** | — | Pan that pane’s Y only |

### Volume vs indicator panes

- **Pure bar charts** (volume): Y minimum stays anchored at `0` during pan/zoom — bars grow/shrink from the baseline.
- **Mixed indicator panes** (histogram + lines + bands): full Y pan/zoom freedom — the entire canvas moves like a line chart.

Set `interactive: false` on a pane to disable pointer events (e.g. read-only overlay).

### Pane resize

When `resizable: true`, drag horizontal dividers between panes. Resize runs at 60 fps without chart flicker; a single layout commit fires on pointer release.

## Composite Indicator Panes

Use [`buildIndicatorPane`](/api/indicator-panes) for histogram + multi-color lines + fills + markers in one pane:

```typescript
import { createStackedChart, buildIndicatorPane } from 'velo-plot';

const wavePane = buildIndicatorPane({
  id: 'wave',
  height: 0.24,
  label: 'Wave',
  yRange: [-80, 80],
  data: {
    x,
    histogram: { y: hist, positiveColor: '#26a69a', negativeColor: '#ef5350' },
    lines: [
      {
        id: 'fast',
        y: fastLine,
        width: 2,
        colorZones: {
          ref: 'slow',
          aboveColor: '#26a69a',
          belowColor: '#ef5350',
        },
      },
      { id: 'slow', y: slowLine, color: 'rgba(255,255,255,0.4)', width: 1.5 },
    ],
  },
});

createStackedChart({ panes: [pricePane, volumePane, wavePane, rsiPane], ... });
```

## Behavior Summary

1. **Aligned margins** — Left/right margins match the widest Y-axis configuration across panes.
2. **Shared bottom axis** — Upper panes use compact bottom margin when `sharedXAxis: 'bottom'`.
3. **Bidirectional X sync** — Any interactive pane can pan/zoom time; others follow on X.
4. **Independent Y** — Y scales never propagate when `axis: 'x'` (default).
5. **Mixed types** — Each pane can use different series types in the same stack.
6. **Master for fit** — `masterPaneId` controls which pane derives the shared X range in `fitAll()`.

## Container Height

The stack container **must have an explicit height** (CSS class, inline style, or parent flex layout):

```html
<div id="chart-root" style="height: 560px"></div>
```

## React Hook

See [`useStackedPlot`](/api/react-hook#usestackedplot-hook) for the React binding.

## Related

- [Pane Stack Example](/examples/pane-stack) — live demo with sync presets
- [Indicator Panes API](/api/indicator-panes) — composite indicator rendering
- [Chart Sync API](/api/chart-sync) — lower-level multi-chart linking
- [`chart.fit()`](/api/chart#fit) — safe single-chart fit
