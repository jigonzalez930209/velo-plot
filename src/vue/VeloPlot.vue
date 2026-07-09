<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { useVeloPlot, type UseVeloPlotOptions } from "./useVeloPlot";
import {
  diffSeries,
  applyChartA11y,
  updateA11y,
  type VeloPlotSeries,
} from "../bindings/shared";
import type { Bounds, CursorOptions, ZoomOptions } from "../types";

const props = withDefaults(
  defineProps<
    UseVeloPlotOptions & {
      series?: VeloPlotSeries[];
      zoom?: ZoomOptions;
      width?: number | string;
      height?: number | string;
      class?: string;
      cursor?: CursorOptions;
      ariaLabel?: string;
      keyboardNav?: boolean;
    }
  >(),
  {
    series: () => [],
    width: "100%",
    height: 400,
    keyboardNav: true,
  },
);

const emit = defineEmits<{
  zoomChange: [bounds: Bounds];
}>();

const {
  containerRef,
  chart,
  isReady,
  bounds,
  addSeries,
  updateSeries,
  removeSeries,
  resetZoom,
} = useVeloPlot(props);

const previousSeries = ref(new Map<string, VeloPlotSeries>());
let a11yHandle: ReturnType<typeof applyChartA11y> | null = null;

watch(
  () => [props.series, isReady.value, chart.value] as const,
  () => {
    if (!isReady.value || !chart.value) return;
    previousSeries.value = diffSeries(
      {
        addSeries,
        updateSeries,
        removeSeries,
        autoScale: () => chart.value?.autoScale(),
      },
      props.series,
      previousSeries.value,
    );
  },
  { deep: true, immediate: true },
);

watch(
  () => [isReady.value, chart.value, props.keyboardNav, props.ariaLabel] as const,
  () => {
    const el = containerRef.value;
    if (!el || !chart.value || !isReady.value) return;
    a11yHandle?.cleanup();
    a11yHandle = applyChartA11y(el, chart.value, {
      label: props.ariaLabel,
      series: props.series,
      bounds: bounds.value,
      enableKeyboard: props.keyboardNav,
    });
  },
  { immediate: true },
);

onUnmounted(() => a11yHandle?.cleanup());

watch(bounds, (b) => {
  const el = containerRef.value;
  if (el && a11yHandle) {
    updateA11y(el, a11yHandle.srTable, {
      label: props.ariaLabel,
      series: props.series,
      bounds: b,
    });
  }
});

defineExpose({ getChart: () => chart.value, resetZoom, getBounds: () => bounds.value });
</script>

<template>
  <div
    ref="containerRef"
    class="velo-plot-container"
    :class="props.class"
    :style="{
      position: 'relative',
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    }"
  />
</template>
