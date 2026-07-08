---
title: Contour Lines & Isoline Labels
description: Render marching-squares contour lines with readable, zoom-aware isoline labels.
---

# Contour Lines & Isoline Labels

velo-plot ships a native marching-squares contour generator (`generateContours`)
that turns a 2D scalar field into joined isoline polylines with oriented labels.
Labels are placed at each isoline's arc-length midpoint, rotated to follow the
local curve direction, and drawn with a contrasting halo so they stay readable
at any zoom level.

<ContourDemo />

## Usage

```typescript
import { createChart, PluginAnnotations, generateContours } from 'velo-plot';

const chart = createChart({ container });
await chart.use(PluginAnnotations());

// Build a scalar field on a regular grid.
const GRID = 60;
const xs = Float32Array.from({ length: GRID }, (_, i) => -3 + (6 * i) / (GRID - 1));
const ys = Float32Array.from({ length: GRID }, (_, i) => -3 + (6 * i) / (GRID - 1));
const z = new Float32Array(GRID * GRID);
for (let j = 0; j < GRID; j++)
  for (let i = 0; i < GRID; i++)
    z[j * GRID + i] = Math.exp(-(xs[i] ** 2 + ys[j] ** 2));

// Generate joined isolines + oriented labels.
const contours = generateContours(z, xs, ys, {
  numLevels: 9,
  labels: true,          // implies joinPaths
  minLabelLength: 8,     // skip tiny fragments
  labelFormatter: (lvl) => lvl.toFixed(0),
});

// Draw each isoline polyline as a line series and each label as a rotated,
// haloed text annotation (annotations re-render on zoom, so labels stay legible).
for (const line of contours) {
  for (const pl of line.polylines ?? [line.points]) {
    chart.addSeries({
      id: `iso-${line.level}-${pl[0].x}`,
      type: 'line',
      data: { x: Float32Array.from(pl.map((p) => p.x)), y: Float32Array.from(pl.map((p) => p.y)) },
      style: { color: '#38bdf8', width: 1.5 },
    });
  }
  for (const lab of line.labels ?? []) {
    chart.addAnnotation({
      type: 'text',
      x: lab.x,
      y: lab.y,
      text: lab.text,
      rotation: (lab.angle * 180) / Math.PI,
      anchor: 'center',
      fontWeight: 'bold',
      color: '#f8fafc',
      backgroundColor: 'rgba(2, 6, 23, 0.75)',
      padding: 3,
    });
  }
}

chart.render();
```

## Options

| Option | Description |
|--------|-------------|
| `numLevels` | Number of automatically-spaced levels (ignored if `levels` is given). |
| `levels` | Explicit array of contour levels. |
| `labels` | Compute oriented isoline labels (implies `joinPaths`). |
| `minLabelLength` | Skip polylines shorter than this many vertices (avoids clutter). |
| `labelFormatter` | Format a level value into label text. |

Each `ContourLabel` carries `{ x, y, level, text, angle }` where `angle` (radians)
is the local isoline tangent, clamped to keep text upright.
