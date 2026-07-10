# SSR-safe integration

velo-plot uses canvas/WebGL and must run in the browser. Use dynamic import and guard server rendering.

## Pattern

```ts
async function mountChart(container: HTMLDivElement) {
  if (typeof window === "undefined") return;
  const { createChart } = await import("velo-plot");
  return createChart({ container });
}
```

## Next.js (App Router)

```tsx
'use client';
import { VeloPlot } from 'velo-plot/react';

export default function Page() {
  return <VeloPlot series={[{ id: 'a', x: dataX, y: dataY }]} />;
}
```

## Nuxt 3

```vue
<client-only>
  <VeloPlot :series="series" />
</client-only>
```

## Astro

```astro
---
import { VeloPlot } from 'velo-plot/astro';
---
<VeloPlot client:only="react" series={series} />
```

Framework bindings (`velo-plot/react`, `velo-plot/vue`, etc.) are all client-only.
