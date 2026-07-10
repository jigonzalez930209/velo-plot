export { default as VeloPlot } from "./VeloPlot.vue";
export { default as StackedPlot } from "./StackedPlot.vue";
export { useVeloPlot, type UseVeloPlotOptions, type UseVeloPlotReturn } from "./useVeloPlot";
export { useStackedPlot, type UseStackedPlotOptions } from "./useStackedPlot";
export { useIndicator } from "./useIndicator";
export { useChartSync, useChartGroup } from "./useChartSync";

import VeloPlotVue from "./VeloPlot.vue";
import { useVeloPlot as useVeloPlotImpl } from "./useVeloPlot";

/** @deprecated Use `VeloPlot` instead. **Removed in v4.0.** */
export const SciPlot = VeloPlotVue;
/** @deprecated Use `useVeloPlot` instead. **Removed in v4.0.** */
export const useSciPlot = useVeloPlotImpl;
/** @deprecated Use `useVeloPlot` instead. **Removed in v4.0.** */
export const useSciChart = useVeloPlotImpl;
