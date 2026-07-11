import type { SVGExportPluginContext } from "./types";
import { fmt } from "../SVGDocumentBuilder";
import { primaryYScale } from "../tickUtils";

export function exportCandlestickMarkers(ctx: SVGExportPluginContext): void {
  if (!ctx.builder) return;
  const yScale = primaryYScale(ctx.yScales);
  if (!yScale) return;

  for (const series of ctx.series) {
    if (!series.isVisible() || series.getType() !== "candlestick") continue;
    const markers = series.getMarkers?.() ?? [];
    const data = series.getData();
    if (!data?.x?.length) continue;

    for (const marker of markers) {
      let idx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < data.x.length; i++) {
        const d = Math.abs(data.x[i] - marker.time);
        if (d < bestDist) {
          bestDist = d;
          idx = i;
        }
      }

      const px = ctx.xScale.transform(data.x[idx]);
      const py = yScale.transform(data.high?.[idx] ?? data.y[idx]);
      const isBuy = marker.shape === "arrowUp" || marker.position === "belowBar";
      const color = marker.color ?? (isBuy ? "#26a69a" : "#ef5350");
      const y = isBuy ? py + 12 : py - 12;
      const points = isBuy
        ? `${fmt(px)},${fmt(y - 6)} ${fmt(px - 5)},${fmt(y + 4)} ${fmt(px + 5)},${fmt(y + 4)}`
        : `${fmt(px)},${fmt(y + 6)} ${fmt(px - 5)},${fmt(y - 4)} ${fmt(px + 5)},${fmt(y - 4)}`;
      ctx.builder.push("plugins", `<polygon points="${points}" fill="${color}"/>`);
    }
  }
}
