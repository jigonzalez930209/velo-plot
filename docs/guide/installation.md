# Installation

## Package Manager

```bash
# npm
npm install velo-plot

# pnpm
pnpm add velo-plot

# yarn
yarn add velo-plot
```

## Imports

Choose the **smallest entry** for your app. See [Bundle Architecture](/guide/bundle-architecture) for the full matrix.

### ES Modules

```typescript
// Core — line/scatter/step/band only (~51 KB gzip)
import { createChart } from 'velo-plot';

// Trading — candles, indicators, stacked, alerts (~72 KB gzip)
import { createStackedChart, PluginDrawingTools } from 'velo-plot/trading';

// Scientific — heatmap, analysis, 3D, LaTeX (~114 KB gzip)
import { createChart, PluginAnalysis, PluginForecasting } from 'velo-plot/scientific';

// Full — everything (heavier)
import { createChart } from 'velo-plot/full';

// Per-plugin (with core entry)
import { PluginAnnotations } from 'velo-plot/plugins/annotations';

// React components
import { VeloPlot, useVeloPlot } from 'velo-plot/react';

// Themes — core exports DARK/LIGHT/DEFAULT; extended themes on scientific/full
import { DARK_THEME, LIGHT_THEME } from 'velo-plot';
import { MIDNIGHT_THEME } from 'velo-plot/scientific';
```

| Entry | API doc |
|-------|---------|
| `velo-plot` | [Core Bundle](/api/core-bundle) |
| `velo-plot/trading` | [Trading Bundle](/api/trading-bundle) |
| `velo-plot/scientific` | [Scientific Bundle](/api/scientific-bundle) |

### TypeScript Usage

Velo Plot is written in TypeScript and includes full type definitions.

```typescript
import { 
  createChart, 
  type Chart, 
  type ChartOptions,
  type SeriesData 
} from 'velo-plot';

const options: ChartOptions = {
  container: document.getElementById('chart')!,
  xAxis: { label: 'Time (s)', auto: true },
  yAxis: { label: 'Voltage (mV)', auto: true },
};

const chart: Chart = createChart(options);
```

## Peer Dependencies

For React usage, ensure you have React 16.8+ installed:

```bash
npm install react react-dom
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

WebGL 2.0 is required for hardware acceleration. Most modern browsers support this out of the box.

## Next Steps

- **[Bundle Architecture](/guide/bundle-architecture)** — pick the right entry and understand sizes.
- **[Quick Start](/guide/quick-start)** — Create your first interactive chart.
- **[Migration v2 → v3](/guide/migration-v3)** — if upgrading from v2.
- **[Plugin System](/guide/plugins)** — Extend the chart with tools.
