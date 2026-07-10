export {
  VeloPlotComponent,
  StackedPlotComponent,
} from "./velo-plot.component";
export {
  VeloPlotHost,
  useVeloPlotAngular,
  useStackedPlotAngular,
  useIndicatorAngular,
  useChartSyncAngular,
} from "./hooks";

import { VeloPlotComponent as VeloPlotComponentImpl } from "./velo-plot.component";
import { useVeloPlotAngular as useVeloPlotAngularImpl } from "./hooks";

/** @deprecated Use `VeloPlotComponent` instead. **Removed in v4.0.** */
export const SciPlotComponent = VeloPlotComponentImpl;
/** @deprecated Use `useVeloPlotAngular` instead. **Removed in v4.0.** */
export const useSciPlotAngular = useVeloPlotAngularImpl;
