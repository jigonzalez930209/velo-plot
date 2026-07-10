import { drawGauge } from "./GaugeRenderer";
import { drawSankey } from "./SankeyRenderer";
import { registerOverlaySeriesDrawer } from "../core/chart/overlaySeriesRegistry";

let registered = false;

export function registerExtendedOverlayDrawers(): void {
  if (registered) return;
  registered = true;

  registerOverlaySeriesDrawer("gauge", (ctx, s, plotArea) => {
    const gData = s.getGaugeData();
    const gStyle = s.getGaugeStyle();
    if (gData && gStyle) drawGauge(ctx, gData, gStyle, plotArea);
  });

  registerOverlaySeriesDrawer("sankey", (ctx, s, plotArea) => {
    const sData = s.getSankeyData();
    const sStyle = s.getSankeyStyle();
    if (sData && sStyle) drawSankey(ctx, sData, sStyle, plotArea);
  });
}
