# Export & Media Utilities

Extract images, video, and raw data from your charts.

## High-Resolution Snapshots (PNG / JPEG / WebP / SVG)

Capture the WebGL plot area and all 2D overlays (axes, annotations, legends). Supports **SVG vector export** and up to **8K** raster resolution.

<SnapshotDemo />

### Single-chart code

```typescript
import { createChart } from 'velo-plot';
import { PluginSnapshot } from 'velo-plot/plugins/snapshot';

const chart = createChart({ container });
chart.use(PluginSnapshot());

// Raster
await chart.snapshot.downloadSnapshot({ format: 'png', resolution: '4k' });

// Vector SVG
const svg = await chart.snapshot.takeSnapshot({ format: 'svg' });
// or synchronously:
const svgSync = chart.exportSVG();
```

[Full API reference →](/api/image-export)

---

## Multi-Pane Stack Export

Export an entire stacked layout (price + volume + RSI, or horizontal side-by-side panes) as one composite image:

```typescript
const png = await stack.exportImage({ format: 'png', resolution: '4k' });

await stack.snapshot({
  format: 'jpeg',
  download: true,
  fileName: 'trading-stack',
  includeDividers: true,
});
```

Try it on the [Multi-Pane Stack example](/examples/pane-stack) — use the **Export PNG / JPEG / WebP** buttons in the toolbar.

Formats: **PNG**, **JPEG**, **WebP** (stack SVG is not yet supported).

---

## Native Video Recording

Record active chart animations directly from the browser buffer.

<VideoRecorderDemo />

---

## Multi-Format Data Export

Extract raw data for external analysis in CSV, JSON, and more.

<DataExportDemo />

---

## API Reference Summary

```typescript
import { PluginSnapshot } from 'velo-plot/plugins/snapshot';
import { PluginVideoRecorder } from 'velo-plot/plugins/video-recorder';
import { PluginDataExport } from 'velo-plot/plugins/data-export';
import { createStackedChart } from 'velo-plot/trading';

// Single chart — raster + SVG
chart.use(PluginSnapshot());
await chart.snapshot.takeSnapshot({ format: 'svg' });
await chart.snapshot.downloadSnapshot({ format: 'webp', resolution: '2k' });
chart.exportSVG(); // built-in vector export

// Multi-pane stack — composite raster
const stack = createStackedChart({ container, panes: [...] });
await stack.exportImage({ format: 'png', resolution: '4k' });

// Video
chart.use(PluginVideoRecorder());
chart.videoRecorder.start();

// Raw data
chart.use(PluginDataExport());
chart.exportCSV();
```

See also: [Image & Vector Export API](/api/image-export) · [Export plugins](/api/plugin-export) · [Data export](/api/export)
