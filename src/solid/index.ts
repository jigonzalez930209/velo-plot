export { VeloPlot, StackedPlot } from "./VeloPlot";
export { useVeloPlot, type UseVeloPlotOptions } from "./useVeloPlot";
export { useStackedPlot } from "./useStackedPlot";
export { useIndicator } from "./useIndicator";
export { useChartSync, useChartGroup } from "./useChartSync";

import { VeloPlot as VeloPlotImpl } from "./VeloPlot";
import { useVeloPlot as useVeloPlotImpl } from "./useVeloPlot";

/** @deprecated Use `VeloPlot` instead. **Removed in v4.0.** */
export const SciPlot = VeloPlotImpl;
/** @deprecated Use `useVeloPlot` instead. **Removed in v4.0.** */
export const useSciPlot = useVeloPlotImpl;
/** @deprecated Use `useVeloPlot` instead. **Removed in v4.0.** */
export const useSciChart = useVeloPlotImpl;
