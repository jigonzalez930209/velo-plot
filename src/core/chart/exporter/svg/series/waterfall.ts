import type { Series } from "../../../../Series";
import { seriesId } from "../seriesUtils";
import type { Scale } from "../../../../../scales";
import type { PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";

export function exportWaterfallSeries(
  series: Series,
  plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  builder: SVGDocumentBuilder,
): void {
  const data = series.getData();
  if (!data?.x?.length) return;

  const style = series.getStyle() as Record<string, unknown>;
  const positiveColor = (style.positiveColor as string) ?? "#22c55e";
  const negativeColor = (style.negativeColor as string) ?? "#ef4444";
  const subtotalColor = (style.subtotalColor as string) ?? "#3b82f6";
  const connectorColor = (style.connectorColor as string) ?? "#64748b";
  const types = (style.waterfallTypes as string[]) ?? [];
  const domainSpan = xScale.domain[1] - xScale.domain[0];
  const barWidth =
    domainSpan > 0
      ? (((style.barWidth as number) ?? 0.8) / domainSpan) * plotArea.width
      : 20;

  let running = 0;
  const clipId = `vp-clip-wf-${seriesId(series)}`;
  builder.registerClipPath(
    clipId,
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}"/>`,
  );

  for (let i = 0; i < data.x.length; i++) {
    const val = data.y[i];
    const type = types[i] ?? (val >= 0 ? "positive" : "negative");
    const px = xScale.transform(data.x[i]);
    let y0: number;
    let y1: number;
    let color: string;

    if (type === "subtotal") {
      y0 = yScale.transform(0);
      y1 = yScale.transform(running);
      color = subtotalColor;
    } else if (type === "total") {
      y0 = yScale.transform(0);
      y1 = yScale.transform(running + val);
      running += val;
      color = subtotalColor;
    } else {
      y0 = yScale.transform(running);
      running += val;
      y1 = yScale.transform(running);
      color = val >= 0 ? positiveColor : negativeColor;
    }

    const top = Math.min(y0, y1);
    const height = Math.max(1, Math.abs(y1 - y0));
    builder.push(
      "series",
      `<rect clip-path="url(#${clipId})" x="${fmt(px - barWidth / 2)}" y="${fmt(top)}" width="${fmt(barWidth)}" height="${fmt(height)}" fill="${color}" fill-opacity="0.9"/>`,
    );

    if (i > 0 && style.showConnectors !== false) {
      const prevPx = xScale.transform(data.x[i - 1]);
      const prevTop = yScale.transform(running - val);
      builder.push(
        "series",
        `<line x1="${fmt(prevPx + barWidth / 2)}" y1="${fmt(prevTop)}" x2="${fmt(px - barWidth / 2)}" y2="${fmt(prevTop)}" stroke="${connectorColor}" stroke-width="1" stroke-opacity="0.6"/>`,
      );
    }
  }
}
