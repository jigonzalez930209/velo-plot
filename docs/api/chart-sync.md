---
title: Chart Synchronization
description: Link multiple charts for synchronized zoom, pan, and cursor — configurable per axis with bidirectional or master-slave modes.
---

::: tip Bundle requirements
- `linkCharts`, `createMasterSlave` → `velo-plot/full`
- `createChartGroup` → `velo-plot/scientific` or `velo-plot/full`
- Core entry (`velo-plot`) does not export sync helpers
:::

# Chart Synchronization

Link multiple charts so they share zoom, pan, and cursor state. Configure sync per axis: **X only**, **Y only**, **both**, or **none**.

## Basic Usage

### Link Two Charts

```typescript
import { createChart, linkCharts } from 'velo-plot/full';

const chart1 = createChart({ container: el1, id: 'chart1' });
const chart2 = createChart({ container: el2, id: 'chart2' });

// Bidirectional X sync (default)
const group = linkCharts(chart1, chart2, { axis: 'x' });
```

::: tip Chart IDs
Pass `id` in `createChart` options or use `chart.getId()`. Sync relies on stable chart identifiers.
:::

### Create a Chart Group

```typescript
import { createChartGroup } from 'velo-plot/scientific';

const group = createChartGroup([chart1, chart2, chart3], {
  axis: 'x',            // 'x' | 'y' | 'xy' | 'none'
  syncCursor: true,
  syncZoom: true,
  syncPan: true,
  bidirectional: true,  // any chart can drive sync
  masterId: 'chart1',   // used by fitAll(); with bidirectional, any chart can still drive pan/zoom
});
```

## Axis Modes

| Mode | Pan/zoom sync | Typical use |
|------|---------------|-------------|
| `'x'` | Time/index only | Price + volume + RSI stacks |
| `'y'` | Value only | Aligned magnitude comparison |
| `'xy'` | Both axes | Twin charts with identical viewport |
| `'none'` | Off | Cursor-only linking |

```typescript
group.syncAxis('y');
group.updateOptions({ axis: 'none', syncZoom: false, syncPan: false });
```

## Bidirectional vs Master-Slave

### Bidirectional (default in `createChartGroup`)

Any chart in the group can drive sync. When `axis: 'x'`, only X bounds propagate — each chart keeps its own Y.

```typescript
createChartGroup([price, volume, rsi], {
  axis: 'x',
  bidirectional: true,
  masterId: 'price', // fitAll() uses price for shared X
});
```

### Master-Slave (`createMasterSlave`)

Only the master chart propagates pan/zoom. Slaves follow but cannot push changes back.

```typescript
import { createMasterSlave } from 'velo-plot/full';

const group = createMasterSlave(priceChart, volumeChart, 'x');
// bidirectional: false, masterId set automatically
```

Pan propagation uses the **source chart's current view bounds**, not raw pixel deltas — slaves stay aligned even when pane heights differ.

## Coordinated Fit

```typescript
group.fitAll({ padding: 0.02 });
group.resetAll();
```

- **`fitAll()`** — Master (or first chart) derives X; each chart fits its own Y.
- **`resetAll()`** — Safe re-fit from data (skips empty charts).

Requires charts to implement `fit()` (all native `Chart` instances do).

## Batch Updates

Suppress sync feedback during programmatic multi-chart updates:

```typescript
group.batch(() => {
  priceChart.zoom({ x: [t0, t1], animate: false });
  volumeChart.fit({ x: [t0, t1] });
  rsiChart.fit({ x: [t0, t1], y: [0, 100] });
});
```

## Cursor Sync

```typescript
group.syncCursor(true);

// Runtime toggle
group.updateOptions({ syncCursor: false });
```

## Managing Groups

```typescript
group.add(chart3);
group.remove(chart2);

group.syncTo({ xMin: 0, xMax: 100 });
group.syncZoom(false);
group.syncPan(false);

console.log(group.getOptions());
console.log(group.size());
group.destroy();
```

## Stacked Charts (Recommended)

For vertical price / volume / indicator layouts, use [`createStackedChart`](/api/stacked-chart) — it wires `ChartGroup`, margins, resize, and fit automatically:

```typescript
const stack = createStackedChart({
  masterPaneId: 'price',
  sync: { axis: 'x', bidirectional: true },
  panes: [...],
});

stack.setSyncAxis('none');
stack.getGroup().fitAll();
```

## Use Cases

### Multi-Timeframe Analysis

```typescript
createMasterSlave(overview, detail, 'x');
```

### Multi-Sensor Dashboard

```typescript
createChartGroup([temp, pressure, humidity], {
  axis: 'x',
  syncCursor: true,
});
```

### Full Viewport Lock

```typescript
createChartGroup([chartA, chartB], { axis: 'xy', bidirectional: true });
```

## API Reference

### ChartGroup Class

```typescript
class ChartGroup {
  add(chart: ChartLike): this;
  addAll(...charts: ChartLike[]): this;
  remove(chart: ChartLike): this;
  getCharts(): ChartLike[];
  size(): number;
  has(chart: ChartLike): boolean;

  syncAxis(axis: SyncAxis): this;
  syncZoom(enabled: boolean): this;
  syncPan(enabled: boolean): this;
  syncCursor(enabled: boolean): this;
  syncSelection(enabled: boolean): this;
  updateOptions(partial: Partial<SyncOptions>): this;
  getOptions(): Readonly<SyncOptions>;

  syncTo(bounds: Partial<Bounds>, excludeChartId?: string): void;
  fitAll(options?: { x?: Range; padding?: number }): void;
  resetAll(): void;
  batch<T>(fn: () => T): T;
  clearAllSelections(): void;
  destroy(): void;
}
```

### SyncOptions

```typescript
interface SyncOptions {
  axis?: 'x' | 'y' | 'xy' | 'none';
  syncCursor?: boolean;      // Default: true
  syncSelection?: boolean;   // Default: false
  syncZoom?: boolean;        // Default: true
  syncPan?: boolean;         // Default: true
  debounce?: number;         // Default: 0 (uses rAF)
  bidirectional?: boolean;   // Default: true
  masterId?: string;         // fitAll driver; optional pan/zoom restriction when bidirectional: false
}
```

### Helpers

```typescript
createChartGroup(charts, options?): ChartGroup
linkCharts(chart1, chart2, options?): ChartGroup
createMasterSlave(master, slave, axis?): ChartGroup
```

### ChartLike

```typescript
interface ChartLike {
  getId(): string;
  getViewBounds(): Bounds;
  zoom(options: { x?: Range; y?: Range; animate?: boolean }): void;
  pan(dx: number, dy: number): void;
  fit?(options?: FitOptions): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}
```

## Selection sync

Enable with `syncSelection: true`. When the user selects points on one chart, the same `{ seriesId, indices }` selection is applied to all other charts in the group. Clearing selection on the source chart clears all slaves.

```typescript
const group = createChartGroup([chart1, chart2], {
  axis: 'x',
  syncSelection: true,
});
```

Requires charts to implement `selectPoints`, `clearSelection`, and emit `selectionChange`.

## Known limitations

- **`PluginSync`** is deprecated — use `ChartGroup` / `createChartGroup` instead. The plugin stub logs a warning and performs no sync.
- **WebGPU renderer** remains experimental; use WebGL (default) for production.
- **Selection sync** propagates by series id and point indices — series ids must match across charts for meaningful cross-chart selection.

## Related

- [Chart Sync Example](/examples/chart-sync)
- [Stacked Chart API](/api/stacked-chart)
- [Pane Stack Example](/examples/pane-stack)
