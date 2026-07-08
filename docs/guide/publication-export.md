# Publication-Ready Export

This guide shows how to produce figures suitable for papers, posters, and
theses: a clean theme, LaTeX axis/annotation labels, and a high-resolution
(up to 8K) raster or vector export via the snapshot plugin.

## 1. A print-friendly theme

Start from a light, high-contrast theme with generous margins and serif fonts
for a classic publication look:

```typescript
import { createChart } from 'velo-plot'

const chart = createChart({
  container: '#fig',
  theme: {
    name: 'publication',
    background: '#ffffff',
    text: { color: '#111111', fontFamily: 'Georgia, "Times New Roman", serif' },
    grid: { color: '#e5e5e5' },
  },
})
```

Keep line widths a touch heavier than the screen default (2–2.5 px) so they
survive down-scaling in a two-column layout.

## 2. LaTeX labels

velo-plot ships a native LaTeX renderer (300+ commands, fractions, roots,
matrices, and math alphabets) — no MathJax/KaTeX dependency required.

```typescript
import { PluginLaTeX } from 'velo-plot/plugins/latex'
await chart.use(PluginLaTeX({ fontFamily: 'serif' }))

chart.xAxis.label = 'E / \\text{V vs Ag/AgCl}'
chart.yAxis.label = '\\frac{dQ}{dV}\\,/\\,\\text{mAh V}^{-1}'

chart.addAnnotation({
  type: 'text',
  x: 0.4, y: 12,
  text: '\\Delta E_p = 59\\,\\text{mV}',
  latex: true,
})
```

LaTeX is supported in **axis labels and annotations** (`latex: true`, or
auto-detected when the string contains LaTeX markers). Legend labels currently
render as plain text.

## 3. High-resolution snapshot (up to 8K)

The snapshot plugin re-renders the scene at an arbitrary pixel ratio so you get
crisp output far beyond the on-screen resolution:

```typescript
import { PluginSnapshot } from 'velo-plot/plugins/snapshot'
await chart.use(PluginSnapshot())

// 8K PNG (7680 px wide), independent of the on-screen canvas size.
const blob = await chart.snapshot.capture({
  format: 'png',
  width: 7680,
  height: 4320,
  pixelRatio: 1,
  background: '#ffffff',
})

// Trigger a download
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'figure-8k.png'
a.click()
URL.revokeObjectURL(url)
```

### Vector output

For infinitely scalable figures, export SVG instead of a raster:

```typescript
const svg = await chart.snapshot.capture({ format: 'svg', width: 1200, height: 800 })
```

## 4. Recommended checklist

- [ ] Light theme, serif fonts, ≥2 px lines
- [ ] LaTeX axis titles and key annotations
- [ ] Export at 300+ DPI equivalent (8K raster or SVG)
- [ ] White (opaque) background for print
- [ ] Embed units in every axis label

## Related

- [Theming System](./theming.md)
- [LaTeX API](../api/plugin-latex.md)
- [Image & Vector Export](../api/image-export.md)
- [Signal Processing Pipeline](./signal-processing.md)
