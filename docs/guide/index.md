# Introduction

Velo Plot is a high-performance WebGL-based charting library designed for scientific data visualization.

::: tip v3 bundles
velo-plot ships multiple entry points (`velo-plot`, `/trading`, `/scientific`, `/full`). Start with **[Bundle Architecture](/guide/bundle-architecture)** to pick the smallest import for your app.
:::

## Why Velo Plot?

- **Performance**: Render 10M+ data points at 60 FPS
- **Precision**: Native Float32/Float64 array support
- **Flexibility**: Works with vanilla JS, React, and other frameworks
- **Analysis**: Built-in tools for peak detection, cycle detection, and more

## Key Features

### WebGL Rendering

Unlike canvas-based libraries, Velo Plot uses WebGL for hardware-accelerated rendering. This enables:

- Smooth zooming and panning without re-rendering data
- Efficient handling of millions of points
- Consistent 60 FPS performance

### TypedArray Support

Data is stored in `Float32Array` or `Float64Array` for:

- Memory efficiency
- Direct GPU buffer uploads
- Scientific precision

### Rich Interactions

Built-in support for:

- Mouse wheel zoom (centered on cursor)
- Click and drag to pan
- Right-click drag for box zoom
- Touch gestures on mobile

### Data Analysis

Integrated utilities for:

- Cycle detection in periodic data
- Peak finding (local maxima/minima)
- Statistical analysis
- Data downsampling (LTTB algorithm)

## Quick Example

```typescript
import { createChart } from 'velo-plot'

const chart = createChart({
  container: document.getElementById('chart'),
  xAxis: { label: 'Time', auto: true },
  yAxis: { label: 'Value', auto: true },
  showControls: true,
})

// Generate 100k points
const n = 100000
const x = new Float32Array(n)
const y = new Float32Array(n)

for (let i = 0; i < n; i++) {
  x[i] = i / 1000
  y[i] = Math.sin(x[i]) + Math.random() * 0.1
}

chart.addSeries({
  id: 'signal',
  type: 'line',
  data: { x, y },
  style: { color: '#00f2ff' },
})
```

## Next Steps

- **[Bundle Architecture](/guide/bundle-architecture)** — pick core, trading, scientific, or full (v3)
- [Installation](/guide/installation) - Add Velo Plot to your project
- [Quick Start](/guide/quick-start) - Create your first chart
- [Migration v2 → v3](/guide/migration-v3) - if upgrading
- [Core Concepts](/guide/concepts) - Understand the architecture
- [React Integration](/guide/react) - Use VeloPlot with React
- [Performance Optimization](/guide/performance) - Handle millions of points
- [Responsive Design](/guide/responsive) - Mobile-first visualization
- [Scientific Analysis](/guide/analysis) - Professional data tools
