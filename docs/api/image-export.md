---
title: Image & Vector Export
description: Export charts as PNG, JPEG, WebP, SVG, and full multi-pane stack images
---

# Image & Vector Export

Sci Plot supports **raster** (PNG, JPEG, WebP) and **vector** (SVG) export for single charts, plus **composite stack export** for multi-pane layouts.

## Quick reference

| API | Formats | Scope |
|-----|---------|-------|
| `chart.exportImage(type?)` | `png`, `jpeg` | Single chart, screen DPR |
| `chart.exportSVG()` | SVG string | Single chart, vector paths + tick labels |
| `chart.snapshot.takeSnapshot()` | `png`, `jpeg`, `webp`, `svg` | Single chart, high-res + overlays |
| `stack.exportImage()` / `stack.snapshot()` | `png`, `jpeg`, `webp` | Full stack layout (all panes) |

---

## Single chart — built-in raster

Synchronous export of the current WebGL + overlay canvas at the chart’s device pixel ratio:

```typescript
const png = chart.exportImage('png');   // data:image/png;base64,...
const jpeg = chart.exportImage('jpeg'); // data:image/jpeg;base64,...
```

Use when you need a fast WYSIWYG capture without loading a plugin.

---

## Single chart — SVG (vector)

Export series as vector paths with axis tick labels (not a raster embedded in SVG):

```typescript
const svgString = chart.exportSVG();

// Download in browser
const blob = new Blob([svgString], { type: 'image/svg+xml' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'chart.svg';
link.click();
URL.revokeObjectURL(url);
```

SVG is ideal for publications, LaTeX documents, and lossless scaling.

---

## Single chart — Snapshot plugin (high-res)

Load `PluginSnapshot` for publication-quality raster export and unified SVG download:

```typescript
import { createChart, PluginSnapshot } from 'velo-plot';

const chart = createChart({ container });
chart.use(PluginSnapshot());

// Raster — returns data URL
const png4k = await chart.snapshot.takeSnapshot({
  format: 'png',
  resolution: '4k',
  includeOverlays: true,
  watermarkText: 'Lab Report 2026',
});

// SVG — returns raw SVG string
const svg = await chart.snapshot.takeSnapshot({ format: 'svg' });

// Auto-download any format
await chart.snapshot.downloadSnapshot({
  format: 'webp',
  quality: 0.92,
  resolution: '2k',
  fileName: 'experiment-42',
});
```

### Snapshot options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `format` | `'png' \| 'jpeg' \| 'webp' \| 'svg'` | `'png'` | Output format |
| `resolution` | `'standard' \| '2k' \| '4k' \| '8k' \| number` | `'standard'` | DPR scale multiplier (raster only) |
| `quality` | `number` | `0.9` | JPEG/WebP compression (0–1) |
| `includeBackground` | `boolean` | `true` | Fill with theme background |
| `includeOverlays` | `boolean` | `true` | Annotations, tooltips on overlay canvas |
| `transparent` | `boolean` | `false` | Transparent background (PNG/WebP) |
| `watermarkText` | `string` | `''` | Optional watermark |
| `fileName` | `string` | `'velo-plot-snapshot-export'` | Download filename |
| `download` | `boolean` | `false` | Trigger browser download |

### Resolution presets

| Preset | Scale | Typical use |
|--------|-------|-------------|
| `standard` | 1× | Screen resolution |
| `2k` | 2× | Retina / slides |
| `4k` | 4× | Print / posters |
| `8k` | 8× | Publication figures |

---

## Multi-pane stack export

`createStackedChart` composes **every pane** at its on-screen layout position into one image:

```typescript
import { createStackedChart } from 'velo-plot';

const stack = createStackedChart({
  container,
  panes: [/* price, volume, rsi, ... */],
});

await stack.whenReady();

// Data URL
const png = await stack.exportImage({ format: 'png', resolution: '4k' });

// Download
await stack.snapshot({
  format: 'jpeg',
  quality: 0.9,
  download: true,
  fileName: 'market-stack',
  includeDividers: true,
});
```

### Stack export options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `format` | `'png' \| 'jpeg' \| 'webp'` | `'png'` | Output format |
| `resolution` | `'standard' \| '2k' \| '4k' \| '8k' \| number` | `'standard'` | DPR scale multiplier |
| `quality` | `number` | `0.92` | JPEG/WebP quality |
| `includeBackground` | `boolean` | `true` | Theme background fill |
| `includeDividers` | `boolean` | `true` | Resize dividers in export |
| `transparent` | `boolean` | `false` | Transparent background |
| `download` | `boolean` | `false` | Auto-download |
| `fileName` | `string` | `'velo-plot-stack'` | Download filename |

::: info Stack SVG
Full-stack **SVG** export is not yet available. Export each pane with `chart.exportSVG()` or use raster stack export for WYSIWYG layouts.
:::

Works for **vertical** and **horizontal** (`direction: 'horizontal'`) stacks.

---

## Format comparison

| Format | Type | Best for | Plugin required |
|--------|------|----------|-----------------|
| PNG | Raster | Screenshots, slides, transparency | Built-in or Snapshot |
| JPEG | Raster | Photos, smaller file size | Built-in or Snapshot |
| WebP | Raster | Modern browsers, good compression | Snapshot |
| SVG | Vector | Papers, Inkscape, infinite zoom | Built-in or Snapshot |
| Stack PNG/JPEG/WebP | Raster | TradingView-style multi-pane figures | Built-in on `StackedChart` |

---

## React example

```tsx
import { useRef } from 'react';
import { SciPlot } from 'velo-plot/react';
import { PluginSnapshot } from 'velo-plot';

function ExportableChart() {
  const ref = useRef(null);

  const exportPng = async () => {
    const chart = ref.current?.getChart();
    if (!chart?.snapshot) return;
    await chart.snapshot.downloadSnapshot({ format: 'png', resolution: '4k' });
  };

  const exportSvg = () => {
    const chart = ref.current?.getChart();
    if (!chart) return;
    const svg = chart.exportSVG();
    // ... blob download as above
  };

  return (
    <>
      <SciPlot ref={ref} onReady={(c) => c.use(PluginSnapshot())} series={[...]} />
      <button onClick={exportPng}>PNG 4K</button>
      <button onClick={exportSvg}>SVG</button>
    </>
  );
}
```

---

## See also

- [Export & Media Plugins](/api/plugin-export) — Snapshot, Video Recorder, Data Export
- [Data Export (CSV/JSON)](/api/export) — Raw series data
- [Stacked Chart API](/api/stacked-chart#stack-export) — Multi-pane layout export
- [Export examples](/examples/export-utilities) — Interactive demos
