# Vue integration

```bash
npm install velo-plot vue
```

## Component

```vue
<script setup>
import { VeloPlot } from 'velo-plot/vue';

const series = [{ id: 'cv', x: xData, y: yData }];
</script>

<template>
  <VeloPlot :series="series" :height="400" theme="midnight" />
</template>
```

## Composables

```vue
<script setup>
import { useVeloPlot, useStackedPlot, useIndicator, useChartSync } from 'velo-plot/vue';
</script>
```

See also [React guide](/guide/react) for equivalent APIs.
