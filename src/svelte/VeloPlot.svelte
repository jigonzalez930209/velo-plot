<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { createVeloPlot, type UseVeloPlotOptions } from "./useVeloPlot";
  import { diffSeries, type VeloPlotSeries } from "../bindings/shared";

  export let series: VeloPlotSeries[] = [];
  export let width: number | string = "100%";
  export let height: number | string = 400;
  export let chartOptions: UseVeloPlotOptions = {};
  let className = "";
  export { className as class };

  const api = createVeloPlot(chartOptions);
  const { isReady, chart, mount, unmount, updateOptions, addSeries, updateSeries, removeSeries } =
    api;
  let container: HTMLDivElement;
  let previous = new Map<string, VeloPlotSeries>();

  onMount(() => mount(container));
  onDestroy(() => unmount());

  $: if ($isReady && $chart) {
    updateOptions(chartOptions);
    previous = diffSeries(
      {
        addSeries,
        updateSeries,
        removeSeries,
        autoScale: () => $chart.autoScale(),
      },
      series,
      previous,
    );
  }
</script>

<div
  bind:this={container}
  class={`velo-plot-container${className ? ` ${className}` : ""}`}
  role="img"
  style:position="relative"
  style:width={typeof width === "number" ? `${width}px` : width}
  style:height={typeof height === "number" ? `${height}px` : height}
/>
