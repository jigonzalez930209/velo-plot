import type { Series } from "../../../../Series";
import { seriesId } from "../seriesUtils";
import type { Scale } from "../../../../../scales";
import type { PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";
import { symbolSvg } from "../symbols";

export function exportBoxplotSeries(
  series: Series,
  plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  builder: SVGDocumentBuilder,
): void {
  const data = series.getData();
  if (!data?.x?.length || !data.median) return;

  const style = series.getStyle() as Record<string, unknown>;
  const color = (style.color as string) ?? "#ff0055";
  const opacity = (style.opacity as number) ?? 1;
  const domainSpan = xScale.domain[1] - xScale.domain[0];
  const boxWidth =
    domainSpan > 0
      ? (((style.barWidth as number) ?? 0.6) / domainSpan) * plotArea.width
      : 16;

  const q1 = (data as { q1?: Float32Array }).q1;
  const q3 = (data as { q3?: Float32Array }).q3;
  const low = data.low;
  const high = data.high;

  const clipId = `vp-clip-box-${seriesId(series)}`;
  builder.registerClipPath(
    clipId,
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}"/>`,
  );

  for (let i = 0; i < data.x.length; i++) {
    const px = xScale.transform(data.x[i]);
    const yQ1 = q1 ? yScale.transform(q1[i]) : yScale.transform(data.y[i]);
    const yQ3 = q3 ? yScale.transform(q3[i]) : yScale.transform(data.y2?.[i] ?? data.y[i]);
    const yMed = yScale.transform(data.median![i]);
    const yLow = low ? yScale.transform(low[i]) : yQ1;
    const yHigh = high ? yScale.transform(high[i]) : yQ3;

    const boxTop = Math.min(yQ1, yQ3);
    const boxH = Math.max(1, Math.abs(yQ3 - yQ1));

    builder.push("series", `<line clip-path="url(#${clipId})" x1="${fmt(px)}" y1="${fmt(yLow)}" x2="${fmt(px)}" y2="${fmt(yHigh)}" stroke="${color}" stroke-width="1"/>`);
    builder.push("series", `<rect clip-path="url(#${clipId})" x="${fmt(px - boxWidth / 2)}" y="${fmt(boxTop)}" width="${fmt(boxWidth)}" height="${fmt(boxH)}" fill="${color}" fill-opacity="${opacity * 0.3}" stroke="${color}"/>`);
    builder.push("series", `<line clip-path="url(#${clipId})" x1="${fmt(px - boxWidth / 2)}" y1="${fmt(yMed)}" x2="${fmt(px + boxWidth / 2)}" y2="${fmt(yMed)}" stroke="${color}" stroke-width="2"/>`);

    const outliers = (data as { outliers?: { x: number; y: number }[][] }).outliers?.[i];
    if (outliers) {
      for (const o of outliers) {
        builder.push("series", symbolSvg("circle", xScale.transform(o.x), yScale.transform(o.y), 4, color, opacity));
      }
    }
  }
}
