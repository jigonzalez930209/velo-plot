---
title: Chart Synchronization Demo
description: Link multiple charts with ChartGroup — X, Y, XY, or no sync with live mode switching.
---

<script setup>
import ChartSyncDemo from '../.vitepress/theme/demos/ChartSyncDemo.vue'
</script>

# Chart Synchronization Demo

Link two charts with `linkCharts` / `ChartGroup`. Zoom or pan one chart — the other follows based on the selected sync mode.

<ChartSyncDemo />

## Sync Modes

| Mode | Description |
|------|-------------|
| **X-Axis Sync** | Shared time/index range; Y independent per chart |
| **Y-Axis Sync** | Shared value range; X independent |
| **Both Axes** | Full viewport lock |
| **No Sync** | Independent charts |

Toggle modes with the buttons above the demo. Cursor sync can be toggled separately.

## Using ChartGroup

```typescript
import { createChart, linkCharts } from 'velo-plot';

const chart1 = createChart({ container: el1, id: 'temp' });
const chart2 = createChart({ container: el2, id: 'humidity' });

const group = linkCharts(chart1, chart2, {
  axis: 'x',
  bidirectional: true,
  syncCursor: true,
  syncZoom: true,
  syncPan: true,
});

// Runtime
group.syncAxis('xy');
group.syncCursor(false);
group.updateOptions({ syncZoom: false });
```

## Master-Slave

When only one chart should drive sync:

```typescript
import { createMasterSlave } from 'velo-plot';

createMasterSlave(priceChart, volumeChart, 'x');
```

## Coordinated Fit

```typescript
group.fitAll();
group.resetAll();

group.batch(() => {
  chart1.zoom({ x: [t0, t1], animate: false });
  chart2.fit({ x: [t0, t1] });
});
```

## Stacked Alternative

For **vertical** price / volume / RSI layouts, prefer [`createStackedChart`](/examples/pane-stack):

```typescript
createStackedChart({
  masterPaneId: 'price',
  sync: { axis: 'x', bidirectional: true },
  resizable: true,
  panes: [price, volume, wave, rsi],
});
```

## See Also

- [API Reference](/api/chart-sync)
- [Pane Stack Example](/examples/pane-stack)
