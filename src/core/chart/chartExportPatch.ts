import { ChartImpl } from "./ChartCore";
import { exportChartSnapshot, type SVGExportOptions } from "./exporter/SVGExporter";
import { registerSVGRenderer } from "../../renderer/registerSVG";

let patched = false;

/** Restore sync SVG export on Chart (trading/scientific/full bundles). */
export function patchExportSVG(): void {
  if (patched) return;
  patched = true;

  registerSVGRenderer();

  ChartImpl.prototype.exportSVG = function (options?: SVGExportOptions): string {
    return exportChartSnapshot(this as unknown as Parameters<typeof exportChartSnapshot>[0], options);
  };
}
