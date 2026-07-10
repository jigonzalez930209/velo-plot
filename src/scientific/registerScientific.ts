/**
 * Scientific bundle registration — extended series + SVG export.
 */
import { registerExtendedSeries } from "../renderer/registerExtendedSeries";
import { patchExportSVG } from "../core/chart/chartExportPatch";

let registered = false;

export function registerScientificBundle(): void {
  if (registered) return;
  registered = true;
  registerExtendedSeries();
  patchExportSVG();
}

registerScientificBundle();
