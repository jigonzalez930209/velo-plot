<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { createStackedPlot } from "./useStackedPlot";
  import type { StackedChartOptions } from "../core/stacked";

  export let panes: StackedChartOptions["panes"];
  export let width: number | string = "100%";
  export let height: number | string = 480;
  export let stackOptions: Omit<StackedChartOptions, "container" | "panes"> = {};
  let className = "";
  export { className as class };

  const api = createStackedPlot({ panes, ...stackOptions });
  let container: HTMLDivElement;

  onMount(() => api.mount(container));
  onDestroy(() => api.unmount());

  $: api.sync({ panes, ...stackOptions });
</script>

<div
  bind:this={container}
  class={`velo-plot-stacked${className ? ` ${className}` : ""}`}
  role="img"
  style:position="relative"
  style:width={typeof width === "number" ? `${width}px` : width}
  style:height={typeof height === "number" ? `${height}px` : height}
/>
