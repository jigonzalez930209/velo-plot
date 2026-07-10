import type { Series } from "../Series";
import type { PlotArea } from "../../types";

export type OverlaySeriesDrawer = (
  overlayCtx: CanvasRenderingContext2D,
  series: Series,
  plotArea: PlotArea,
) => void;

const drawers = new Map<string, OverlaySeriesDrawer>();

export function registerOverlaySeriesDrawer(
  type: string,
  drawer: OverlaySeriesDrawer,
): void {
  drawers.set(type, drawer);
}

export function getOverlaySeriesDrawer(
  type: string,
): OverlaySeriesDrawer | undefined {
  return drawers.get(type);
}

export function drawRegisteredOverlaySeries(
  overlayCtx: CanvasRenderingContext2D,
  series: Iterable<Series>,
  plotArea: PlotArea,
): void {
  for (const s of series) {
    if (!s.isVisible()) continue;
    const drawer = drawers.get(s.getType());
    if (drawer) drawer(overlayCtx, s, plotArea);
  }
}
