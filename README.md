# Velo Plot 🚀

A high-performance, WebGL-powered scientific charting engine built for precision, speed, and deep interactivity. Optimized for electrochemical and scientific data visualization.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/velo-plot.svg)](https://www.npmjs.com/package/velo-plot)


## ✨ Features

::: tip v3 bundle entries
The default import (`velo-plot`) is the **core** bundle (~51 KB gzip): line, scatter, step, band, and area charts. Candlesticks, heatmaps, analysis, and trading APIs require `velo-plot/trading`, `velo-plot/scientific`, or `velo-plot/full`. See [Bundle Architecture](docs/guide/bundle-architecture.md).
:::

-   **🚀 High Performance**: Render millions of data points at 60 FPS using a specialized raw WebGL renderer.
-   **📈 Advanced Analysis**: Built-in peak detection, integration, baseline correction, and customizable curve fitting (linear/poly/exp).
-   **📊 Specialized Series**: Support for Lines, Scatter (SDF symbols), Step charts, Band series, Area charts, **Candlesticks** (OHLC), and **Stacked Charts**.
-   **↕️ Multi-Axis Engine**: Independent scales and units with axis-specific scrolling and zooming.
-   **📏 Professional Tooling**: Real-time Statistics panel, Annotations (Lines/Shapes/Text), and **high-fidelity SVG/PNG export**.
-   **🎨 Color Schemes**: **5 professional palettes** with 20 colors each for multi-series charts, auto-assigned when colors aren't specified.
-   **✨ Interactive Legend**: Hover over series in legend to **bring to front** and highlight with distinct color.
-   **🔌 Extensible**: **Plugin System** with lifecycle hooks for custom drawing and data analysis.
-   **⚛️ Framework First**: Native React support via hooks and high-level components.
-   **🎨 Dynamic Theming**: Sleek built-in themes (Light/Midnight) with support for custom CSS-based skins.
-   **🏗️ Modular Core**: Built on a modern, decoupled architecture for maximum extendability.

## 🛠️ Installation

**Requirements:** Node.js **24+**, pnpm **11+** (enforced via `packageManager` in `package.json`).

```bash
# Enable pnpm via Corepack (recommended)
corepack enable
corepack prepare pnpm@11.9.0 --activate

# Or install pnpm: https://pnpm.io/installation
```

```bash
pnpm add velo-plot
```

### Development (this repo)

```bash
git clone https://github.com/jigonzalez930209/velo-plot.git
cd velo-plot
pnpm install
pnpm test
pnpm build
pnpm docs:dev
```

## 🚀 Quick Examples

### React (Recommended)

```tsx
import { VeloPlot } from 'velo-plot/react';

function App() {
  const data = {
    x: new Float32Array([0, 1, 2, 3]),
    y: new Float32Array([10, 20, 15, 25])
  };

  return (
    <div style={{ width: '800px', height: '400px' }}>
      <VeloPlot 
        series={[{ id: 's1', ...data, color: '#00f2ff' }]}
        xAxis={{ label: 'Time (s)' }}
        yAxis={{ label: 'Voltage (V)' }}
        showControls
      />
    </div>
  );
}
```

### Vanilla JavaScript

```typescript
import { createChart } from 'velo-plot';

const chart = createChart({
  container: document.getElementById('chart-container'),
  theme: 'dark',
  colorScheme: 'vibrant', // Auto-assigns colors from vibrant palette
  showLegend: true
});

// Series without explicit colors get auto-assigned from the scheme
chart.addSeries({
  id: 'signal1',
  type: 'line',
  data: { x: [...], y: [...] }
});

chart.addSeries({
  id: 'signal2',
  type: 'line',
  data: { x: [...], y: [...] }
});

// Change color scheme at runtime
chart.setColorScheme('ocean');
```

### Multi-Series with Color Schemes

```typescript
// Create chart with 20+ series - colors auto-cycle
const chart = createChart({
  container: document.getElementById('chart'),
  colorScheme: 'neon', // 'vibrant', 'pastel', 'neon', 'earth', 'ocean'
  showLegend: true
});

// Add multiple series - colors assigned automatically
for (let i = 0; i < 20; i++) {
  chart.addSeries({
    id: `series${i}`,
    name: `Dataset ${i + 1}`,
    type: 'line',
    data: generateData(i)
  });
}

// Hover over series in legend → brings to front + highlights! ✨
```

## 📖 Documentation

Visit [Velo Plot Docs](https://jigonzalez930209.github.io/velo-plot/) for:
-   [Bundle Architecture](https://jigonzalez930209.github.io/velo-plot/guide/bundle-architecture) — **start here for v3 imports**
-   [Getting Started Guide](https://jigonzalez930209.github.io/velo-plot/guide/)
-   [Core Concepts](https://jigonzalez930209.github.io/velo-plot/guide/concepts)
-   [API Reference](https://jigonzalez930209.github.io/velo-plot/api/chart)
-   [Interactive Examples](https://jigonzalez930209.github.io/velo-plot/examples/)
-   [Development Roadmap](https://jigonzalez930209.github.io/velo-plot/roadmap/)

## 🗺️ Development Roadmap

The library is at **v3.0.0**. Roadmap: [`docs/roadmap/`](./docs/roadmap/README.md). Plugin audit: [`docs/PLUGIN-STATUS.md`](./docs/PLUGIN-STATUS.md). Migration: [v1→v2](./docs/guide/migration-v2.md), [v2→v3](./docs/guide/migration-v3.md). **Bundles:** [Architecture](./docs/guide/bundle-architecture.md).

### Bundle entry points

| Import | Gzip (approx.) | Contents |
|--------|----------------|----------|
| `velo-plot` | ~51 KB | Core: line, scatter, step, band, plugins API |
| `velo-plot/trading` | ~72 KB | + candles, indicators, stacked, alerts, WebGPU |
| `velo-plot/scientific` | ~114 KB | + heatmap, bar, polar, analysis, 3D, LaTeX |
| `velo-plot/full` | heavier | Everything |
| `velo-plot/react` | — | `VeloPlot`, `StackedPlot`, hooks |
| `velo-plot/vue` | — | `VeloPlot`, composables |
| `velo-plot/svelte` | — | hooks + Svelte components |
| `velo-plot/solid` | — | `VeloPlot`, hooks |
| `velo-plot/angular` | — | components + services |
| `velo-plot/astro` | — | island wrappers |
| `velo-plot/plugins/*` | varies | Individual plugins (tree-shakeable) |

Full guide: [Bundle Architecture](https://jigonzalez930209.github.io/velo-plot/guide/bundle-architecture)

## 📄 License

MIT © [jigonzalez930209](https://github.com/jigonzalez930209)
