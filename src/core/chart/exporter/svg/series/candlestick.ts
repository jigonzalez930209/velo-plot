import type { Series } from "../../../../Series";
import { seriesId } from "../seriesUtils";
import type { Scale } from "../../../../../scales";
import type { PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";

export function exportCandlestickSeries(
  series: Series,
  plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  builder: SVGDocumentBuilder,
): void {
  const data = series.getData();
  if (!data?.open || !data.high || !data.low || !data.close || data.x.length === 0) return;

  const style = series.getStyle() as Record<string, unknown>;
  const domainSpan = xScale.domain[1] - xScale.domain[0];
  const barWidthData = (style.barWidth as number) ?? 0.8;
  const bw =
    domainSpan > 0
      ? (barWidthData / domainSpan) * plotArea.width
      : ((style.barWidth as number) || 5);
  const bullishColor = (style.bullishColor as string) || "#26a69a";
  const bearishColor = (style.bearishColor as string) || "#ef5350";
  const hollow = style.hollow === true;

  const clipId = `vp-clip-candle-${seriesId(series)}`;
  builder.registerClipPath(
    clipId,
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}"/>`,
  );

  for (let i = 0; i < data.x.length; i++) {
    const isBull = data.close[i] >= data.open[i];
    const px = xScale.transform(data.x[i]);
    const pyOpen = yScale.transform(data.open[i]);
    const pyClose = yScale.transform(data.close[i]);
    const pyHigh = yScale.transform(data.high[i]);
    const pyLow = yScale.transform(data.low[i]);
    const color = isBull ? bullishColor : bearishColor;

    builder.push(
      "series",
      `<line clip-path="url(#${clipId})" x1="${fmt(px)}" y1="${fmt(pyHigh)}" x2="${fmt(px)}" y2="${fmt(pyLow)}" stroke="${color}" stroke-width="1"/>`,
    );

    const yTop = Math.min(pyOpen, pyClose);
    const yHeight = Math.max(1, Math.abs(pyOpen - pyClose));
    const fill = hollow && isBull ? "none" : color;
    const stroke = hollow && isBull ? color : "none";
    builder.push(
      "series",
      `<rect clip-path="url(#${clipId})" x="${fmt(px - bw / 2)}" y="${fmt(yTop)}" width="${fmt(bw)}" height="${fmt(yHeight)}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    );
  }
}
