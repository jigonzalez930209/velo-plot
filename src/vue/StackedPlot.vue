<script setup lang="ts">
import { useStackedPlot, type UseStackedPlotOptions } from "./useStackedPlot";

const props = withDefaults(
  defineProps<
    UseStackedPlotOptions & {
      width?: number | string;
      height?: number | string;
      class?: string;
      ariaLabel?: string;
    }
  >(),
  {
    width: "100%",
    height: 480,
  },
);

const { containerRef, stack, isReady, fitAll, resetAll } = useStackedPlot(props);

defineExpose({
  getStack: () => stack.value,
  fitAll,
  resetAll,
  getBounds: () => stack.value?.getMaster().getViewBounds() ?? null,
});
</script>

<template>
  <div
    ref="containerRef"
    class="velo-plot-stacked"
    :class="props.class"
    role="img"
    :aria-label="ariaLabel ?? `Stacked chart with ${panes.length} panes`"
    :data-ready="isReady"
    :style="{
      position: 'relative',
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    }"
  />
</template>
