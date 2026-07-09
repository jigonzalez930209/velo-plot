# Svelte integration

```bash
npm install velo-plot svelte
```

```svelte
<script>
  import { VeloPlot } from 'velo-plot/svelte';
  export let series = [];
</script>

<VeloPlot {series} height={400} />
```

Hooks: `useVeloPlot`, `useStackedPlot`, `useIndicator`, `useChartSync` from `velo-plot/svelte`.
