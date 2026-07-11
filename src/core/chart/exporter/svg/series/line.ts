import type { Series } from "../../../../Series";
import { seriesId } from "../seriesUtils";
import type { Scale } from "../../../../../scales";
import type { PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";
import { symbolSvg } from "../symbols";
import { buildLineSegments, collectFiniteIndices } from "./finitePoints";

export function buildStepPoints(
  data: { x: Float32Array | Float64Array; y: Float32Array | Float64Array },
  xScale: Scale,
  yScale: Scale,
  stepMode: string,
): string[] {
  const points: string[] = [];
  const mode = stepMode === "before" || stepMode === "center" ? stepMode : "after";

  for (let i = 0; i < data.x.length; i++) {
    const px = xScale.transform(data.x[i]);
    const py = yScale.transform(data.y[i]);

    if (i === 0) {
      points.push(`${fmt(px)},${fmt(py)}`);
      continue;
    }

    const prevPx = xScale.transform(data.x[i - 1]);
    const prevPy = yScale.transform(data.y[i - 1]);

    if (mode === "after") {
      points.push(`${fmt(px)},${fmt(prevPy)}`);
      points.push(`${fmt(px)},${fmt(py)}`);
    } else if (mode === "before") {
      points.push(`${fmt(prevPx)},${fmt(py)}`);
      points.push(`${fmt(px)},${fmt(py)}`);
    } else {
      const midX = (prevPx + px) / 2;
      points.push(`${fmt(midX)},${fmt(prevPy)}`);
      points.push(`${fmt(midX)},${fmt(py)}`);
      points.push(`${fmt(px)},${fmt(py)}`);
    }
  }

  return points;
}

export function exportLineSeries(
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
  const width = (style.width as number) ?? 1.5;
  const opacity = (style.opacity as number) ?? 1;
  const dash = style.dash as number[] | undefined;

  const clipId = `vp-clip-${seriesId(series)}`;
  builder.registerClipPath(
    clipId,
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}"/>`,
  );

  const dashAttr = dash?.length ? ` stroke-dasharray="${dash.join(",")}"` : "";
  const isStep = type === "step" || type === "step+scatter";
  const lineJoin = isStep ? "miter" : "round";

  if (type === "step" || type === "step+scatter") {
    const points = buildStepPoints(data, xScale, yScale, (style.stepMode as string) || "after");
    if (points.length >= 2) {
      builder.push(
        "series",
        `<polyline clip-path="url(#${clipId})" points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}" stroke-linejoin="${lineJoin}"${dashAttr}/>`,
      );
    }
  } else {
    const segments = buildLineSegments(
      collectFiniteIndices(data.x, data.y),
      data.x,
      data.y,
      xScale,
      yScale,
    );
    for (const points of segments) {
      builder.push(
        "series",
        `<polyline clip-path="url(#${clipId})" points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}" stroke-linejoin="${lineJoin}"${dashAttr}/>`,
      );
    }
  }

  if (type === "line+scatter" || type === "step+scatter") {
    exportScatterPoints(series, plotArea, xScale, yScale, builder, true);
  }
}

export function exportScatterPoints(
  series: Series,
  _plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  builder: SVGDocumentBuilder,
  skipLine = false,
): void {
  if (!skipLine && series.getType() === "scatter") {
    // pure scatter only
  }
  const data = series.getData();
  if (!data || data.x.length === 0) return;
  const style = series.getStyle() as Record<string, unknown>;
  const color = (style.color as string) ?? "#ff0055";
  const opacity = (style.opacity as number) ?? 1;
  const pointSize = (style.pointSize as number) ?? 4;
  const symbol = (style.symbol as string) ?? "circle";

  for (let i = 0; i < data.x.length; i++) {
    const px = xScale.transform(data.x[i]);
    const py = yScale.transform(data.y[i]);
    builder.push("series", symbolSvg(symbol, px, py, pointSize, color, opacity));
  }
}

export function exportScatterSeries(
  series: Series,
  plotArea: PlotArea,
  xScale: Scale,
  yScale: Scale,
  builder: SVGDocumentBuilder,
): void {
  exportScatterPoints(series, plotArea, xScale, yScale, builder);
}
