import type { Series } from "../../../../Series";
import { seriesId } from "../seriesUtils";
import type { Scale } from "../../../../../scales";
import type { PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";
import { collectFiniteIndices } from "./finitePoints";

export function exportBandSeries(
  series: Series,
  plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  builder: SVGDocumentBuilder,
): void {
  const data = series.getData();
  if (!data || data.x.length === 0) return;

  const style = series.getStyle() as Record<string, unknown>;
  const type = series.getType();
  const color = (style.color as string) ?? "#ff0055";
  const opacity = (style.opacity as number) ?? 1;
  const width = (style.width as number) ?? 1;
  const fillOpacity = (style.fillOpacity as number) ?? opacity * 0.3;

  const y2 =
    type === "area"
      ? new Float32Array(data.x.length).fill((style.baseline as number) ?? 0)
      : data.y2 ?? new Float32Array(data.x.length).fill(0);

  const indices = collectFiniteIndices(data.x, data.y, y2);
  if (indices.length < 2) return;

  const points: string[] = [];
  for (const i of indices) {
    points.push(`${fmt(xScale.transform(data.x[i]))},${fmt(yScale.transform(data.y[i]))}`);
  }
  for (let j = indices.length - 1; j >= 0; j--) {
    const i = indices[j];
    points.push(`${fmt(xScale.transform(data.x[i]))},${fmt(yScale.transform(y2[i]))}`);
  }

  const clipId = `vp-clip-band-${seriesId(series)}`;
  builder.registerClipPath(
    clipId,
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}"/>`,
  );

  let fillAttr = `fill="${color}" fill-opacity="${fillOpacity}"`;
  if (style.gradient) {
    const gradId = builder.registerLinearGradient(0, 0, 0, 1, [
      { offset: "0%", color, opacity: fillOpacity },
      { offset: "100%", color, opacity: 0 },
    ]);
    fillAttr = `fill="url(#${gradId})"`;
  }

  builder.push(
    "series",
    `<polygon clip-path="url(#${clipId})" points="${points.join(" ")}" ${fillAttr} stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}"/>`,
  );
}
