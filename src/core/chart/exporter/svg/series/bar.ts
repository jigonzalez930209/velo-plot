import type { Series } from "../../../../Series";
import { seriesId } from "../seriesUtils";
import type { Scale } from "../../../../../scales";
import type { PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";
import { calculateBarWidth } from "../../../../../renderer/BarRenderer";

export function exportBarSeries(
  series: Series,
  plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  builder: SVGDocumentBuilder,
): void {
  const data = series.getData();
  if (!data || data.x.length === 0) return;

  const style = series.getStyle() as Record<string, unknown>;
  const color = (style.color as string) ?? "#ff0055";
  const opacity = (style.opacity as number) ?? 1;
  const domainSpan = xScale.domain[1] - xScale.domain[0];
  const barWidthData =
    (style.barWidth as number | undefined) ?? calculateBarWidth(data.x);
  const barWidthPx =
    domainSpan > 0
      ? (barWidthData / domainSpan) * plotArea.width
      : ((style.barWidth as number) || 5);

  const baseline = (style.baseline as number) ?? 0;
  const p0 = yScale.transform(baseline);

  const clipId = `vp-clip-bar-${seriesId(series)}`;
  builder.registerClipPath(
    clipId,
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}"/>`,
  );

  for (let i = 0; i < data.x.length; i++) {
    const px = xScale.transform(data.x[i]);
    const py = yScale.transform(data.y[i]);
    const yTop = Math.min(py, p0);
    const yHeight = Math.max(1, Math.abs(py - p0));
    builder.push(
      "series",
      `<rect clip-path="url(#${clipId})" x="${fmt(px - barWidthPx / 2)}" y="${fmt(yTop)}" width="${fmt(barWidthPx)}" height="${fmt(yHeight)}" fill="${color}" fill-opacity="${opacity}"/>`,
    );
  }
}
