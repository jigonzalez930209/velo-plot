import type { Series } from "../../../../Series";
import type { Scale } from "../../../../../scales";
import type { PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";
import { symbolSvg } from "../symbols";

/** Ternary plot: equilateral triangle with normalized (a,b,c) components. */
export function exportTernarySeries(
  series: Series,
  plotArea: PlotArea,
  _xScale: Scale,
  _yScale: Scale,
  builder: SVGDocumentBuilder,
): void {
  const data = series.getData();
  const style = series.getStyle() as Record<string, unknown>;
  const color = (style.color as string) ?? "#ff0055";

  const ax = plotArea.x + plotArea.width / 2;
  const ay = plotArea.y + plotArea.height - 20;
  const side = Math.min(plotArea.width, plotArea.height) - 40;
  const h = (side * Math.sqrt(3)) / 2;

  const v0 = { x: ax, y: ay };
  const v1 = { x: ax - side / 2, y: ay - h };
  const v2 = { x: ax + side / 2, y: ay - h };

  builder.push(
    "series",
    `<polygon points="${fmt(v0.x)},${fmt(v0.y)} ${fmt(v1.x)},${fmt(v1.y)} ${fmt(v2.x)},${fmt(v2.y)}" fill="none" stroke="${color}" stroke-width="1"/>`,
  );

  for (let i = 1; i <= 4; i++) {
    const t = i / 5;
    const a = { x: v0.x + (v1.x - v0.x) * t, y: v0.y + (v1.y - v0.y) * t };
    const b = { x: v0.x + (v2.x - v0.x) * t, y: v0.y + (v2.y - v0.y) * t };
    builder.push("grid", `<line x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}" stroke="${color}" stroke-opacity="0.2"/>`);
  }

  if (!data?.x?.length) return;
  for (let i = 0; i < data.x.length; i++) {
    const a = data.x[i];
    const b = data.y[i];
    const c = 1 - a - b;
    const px = a * v1.x + b * v2.x + c * v0.x;
    const py = a * v1.y + b * v2.y + c * v0.y;
    builder.push("series", symbolSvg("circle", px, py, 6, color));
  }
}
