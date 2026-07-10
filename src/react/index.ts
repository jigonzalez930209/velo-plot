/**
 * React bindings for Velo Plot
 */

export {
  VeloPlot,
  type VeloPlotProps,
  type VeloPlotRef,
  type VeloPlotSeries,
} from "./VeloPlot";
export {
  StackedPlot,
  type StackedPlotProps,
  type StackedPlotRef,
  type StackedPlotIndicator,
} from "./StackedPlot";
export {
  useVeloPlot,
  type UseVeloPlotOptions,
  type UseVeloPlotReturn,
} from "./useVeloPlot";
export {
  useStackedPlot,
  type UseStackedPlotOptions,
  type UseStackedPlotReturn,
} from "./useStackedPlot";
export {
  useIndicator,
  type UseIndicatorReturn,
} from "./useIndicator";
export {
  useChartSync,
  useChartGroup,
  type UseChartSyncReturn,
} from "./useChartSync";

// ---------------------------------------------------------------------------
// Backward-compatible aliases (SciPlot / SciChart branding → VeloPlot)
// Removed in v4.0.
// ---------------------------------------------------------------------------
import { VeloPlot as VeloPlotImpl } from "./VeloPlot";
import { useVeloPlot as useVeloPlotImpl } from "./useVeloPlot";

/**
 * @deprecated Use `VeloPlot` instead. **Removed in v4.0.**
 */
export const SciPlot = VeloPlotImpl;
/**
 * @deprecated Use `VeloPlot` instead. **Removed in v4.0.**
 */
export const SciChart = VeloPlotImpl;
/**
 * @deprecated Use `useVeloPlot` instead. **Removed in v4.0.**
 */
export const useSciPlot = useVeloPlotImpl;
/**
 * @deprecated Use `useVeloPlot` instead. **Removed in v4.0.**
 */
export const useSciChart = useVeloPlotImpl;

export type {
  VeloPlotProps as SciPlotProps,
  VeloPlotRef as SciPlotRef,
  VeloPlotSeries as SciPlotSeries,
  VeloPlotProps as SciChartProps,
  VeloPlotRef as SciChartRef,
  VeloPlotSeries as SciChartSeries,
} from "./VeloPlot";
export type {
  UseVeloPlotOptions as UseSciPlotOptions,
  UseVeloPlotReturn as UseSciPlotReturn,
  UseVeloPlotOptions as UseSciChartOptions,
  UseVeloPlotReturn as UseSciChartReturn,
} from "./useVeloPlot";
