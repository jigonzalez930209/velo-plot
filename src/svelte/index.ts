export { createVeloPlot, useVeloPlot, type UseVeloPlotOptions } from "./useVeloPlot";
export { createStackedPlot, useStackedPlot } from "./useStackedPlot";
export { useIndicator } from "./useIndicator";
export { useChartSync, useChartGroup } from "./useChartSync";

import { useVeloPlot as useVeloPlotImpl, createVeloPlot as createVeloPlotImpl } from "./useVeloPlot";

/** @deprecated Use `useVeloPlot` / `createVeloPlot` instead. **Removed in v4.0.** */
export const useSciPlot = useVeloPlotImpl;
/** @deprecated Use `createVeloPlot` instead. **Removed in v4.0.** */
export const createSciPlot = createVeloPlotImpl;
/** @deprecated Use `useVeloPlot` instead. **Removed in v4.0.** */
export const useSciChart = useVeloPlotImpl;

// Svelte components: import from 'velo-plot/svelte/VeloPlot.svelte' (shipped as source)
