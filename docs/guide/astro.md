# Astro integration

```bash
npm install velo-plot astro react react-dom
```

```astro
---
import VeloPlot from 'velo-plot/astro/VeloPlot.astro';
const series = [{ id: 'line', x: [0,1,2], y: [0,1,0] }];
---
<VeloPlot client:only="react" series={series} height={400} />
```

`StackedPlot.astro` is also available from `velo-plot/astro`.

See [SSR guide](/guide/ssr) for hydration patterns.
