import { ChartImpl } from "../core/chart/ChartCore";

let registered = false;

/**
 * Enable `renderer: 'svg'` — live vector chart (same API as canvas/WebGL, no 3D).
 * Requires extended bundle (trading / scientific / full) with SVG export patched.
 */
export function registerSVGRenderer(): void {
  if (registered) return;
  registered = true;

  const prev = ChartImpl.afterConstruct;
  ChartImpl.afterConstruct = (chart, options) => {
    prev?.(chart, options);
    if (options.renderer !== "svg") return;
    initSVGRenderer(chart);
  };
}

function initSVGRenderer(chart: ChartImpl): void {
  const host = chart as unknown as {
    svgRoot?: SVGSVGElement | null;
    webglCanvas?: HTMLCanvasElement;
    overlayCanvas?: HTMLCanvasElement;
  };

  if (!host.svgRoot) return;

  host.webglCanvas!.style.display = "none";
  if (host.overlayCanvas) {
    host.overlayCanvas.style.display = "block";
    host.overlayCanvas.style.pointerEvents = "none";
    host.overlayCanvas.style.zIndex = "2";
  }
  host.svgRoot.style.display = "block";
  host.svgRoot.style.zIndex = "1";
}
