import type { Series } from "../../../../Series";
import { seriesId } from "../seriesUtils";
import type { Scale } from "../../../../../scales";
import type { PlotArea } from "../../../../../types";
import type { PolarMode } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";
import {
  interleavePolarFillData,
  interleavePolarLineData,
} from "../../../../../renderer/PolarRenderer";

function dataToPixelPoints(
  cartesian: Float32Array,
  xScale: Scale,
  yScale: Scale,
): string[] {
  const points: string[] = [];
  for (let i = 0; i < cartesian.length / 2; i++) {
    const px = xScale.transform(cartesian[i * 2]);
    const py = yScale.transform(cartesian[i * 2 + 1]);
    points.push(`${fmt(px)},${fmt(py)}`);
  }
  return points;
}

export function exportPolarSeries(
  series: Series,
  plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  builder: SVGDocumentBuilder,
): void {
  const polar = series.getPolarData?.();
  if (!polar) return;

  const style = series.getStyle() as Record<string, unknown>;
  const color = (style.color as string) ?? "#ff0055";
  const opacity = (style.opacity as number) ?? 1;
  const width = (style.width as number) ?? 1.5;
  const fillOpacity = (style.fillOpacity as number) ?? opacity * 0.2;
  const angleMode = (style.angleMode as PolarMode) ?? "degrees";
  const closePath = style.closePath !== false;
  const fill = Boolean(style.fill);

  const clipId = `vp-clip-polar-${seriesId(series)}`;
  builder.registerClipPath(
    clipId,
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}"/>`,
  );

  if (fill) {
    const fillData = interleavePolarFillData(polar, angleMode, closePath);
    const centerX = xScale.transform(0);
    const centerY = yScale.transform(0);
    const numTriangles = fillData.length / 6;

    for (let i = 0; i < numTriangles; i++) {
      const base = i * 6;
      const pts = [
        `${fmt(centerX)},${fmt(centerY)}`,
        `${fmt(xScale.transform(fillData[base + 2]))},${fmt(yScale.transform(fillData[base + 3]))}`,
        `${fmt(xScale.transform(fillData[base + 4]))},${fmt(yScale.transform(fillData[base + 5]))}`,
      ];
      builder.push(
        "series",
        `<polygon clip-path="url(#${clipId})" points="${pts.join(" ")}" fill="${color}" fill-opacity="${fillOpacity}" stroke="none"/>`,
      );
    }
  }

  const lineData = interleavePolarLineData(polar, angleMode, closePath);
  const points = dataToPixelPoints(lineData, xScale, yScale);
  if (points.length === 0) return;

  builder.push(
    "series",
    `<polyline clip-path="url(#${clipId})" points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}"/>`,
  );
}
