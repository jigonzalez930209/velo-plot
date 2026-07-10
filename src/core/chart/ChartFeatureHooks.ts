/**
 * Optional chart feature hooks registered by trading/full bundles.
 */
import type { PriceAlertOptions } from "./ChartAlerts";

export interface ChartFeatureHooks {
  onDataUpdate?: () => void;
  getAlerts?: () => PriceAlertOptions[];
  destroy?: () => void;
}
