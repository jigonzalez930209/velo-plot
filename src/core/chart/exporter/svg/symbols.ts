/**
 * Scatter / legend symbol paths for SVG export.
 */

import { fmt } from "./SVGDocumentBuilder";

export type ScatterSymbol =
  | "circle"
  | "square"
  | "diamond"
  | "triangle"
  | "triangleDown"
  | "cross"
  | "x"
  | "star";

export function symbolSvg(
  symbol: string,
  cx: number,
  cy: number,
  size: number,
  fill: string,
  opacity = 1,
  stroke?: string,
): string {
  const r = size / 2;
  const fillAttr = `fill="${fill}" fill-opacity="${opacity}"`;
  const strokeAttr = stroke ? ` stroke="${stroke}" stroke-width="1"` : "";

  switch (symbol as ScatterSymbol) {
    case "square":
      return `<rect x="${fmt(cx - r)}" y="${fmt(cy - r)}" width="${fmt(size)}" height="${fmt(size)}" ${fillAttr}${strokeAttr}/>`;
    case "diamond":
      return `<polygon points="${fmt(cx)},${fmt(cy - r)} ${fmt(cx + r)},${fmt(cy)} ${fmt(cx)},${fmt(cy + r)} ${fmt(cx - r)},${fmt(cy)}" ${fillAttr}${strokeAttr}/>`;
    case "triangle":
      return `<polygon points="${fmt(cx)},${fmt(cy - r)} ${fmt(cx + r)},${fmt(cy + r)} ${fmt(cx - r)},${fmt(cy + r)}" ${fillAttr}${strokeAttr}/>`;
    case "triangleDown":
      return `<polygon points="${fmt(cx)},${fmt(cy + r)} ${fmt(cx + r)},${fmt(cy - r)} ${fmt(cx - r)},${fmt(cy - r)}" ${fillAttr}${strokeAttr}/>`;
    case "cross": {
      const s = stroke ?? fill;
      return `<g stroke="${s}" stroke-width="1" stroke-opacity="${opacity}"><line x1="${fmt(cx - r)}" y1="${fmt(cy)}" x2="${fmt(cx + r)}" y2="${fmt(cy)}"/><line x1="${fmt(cx)}" y1="${fmt(cy - r)}" x2="${fmt(cx)}" y2="${fmt(cy + r)}"/></g>`;
    }
    case "x": {
      const d = r * 0.707;
      const s = stroke ?? fill;
      return `<g stroke="${s}" stroke-width="1" stroke-opacity="${opacity}"><line x1="${fmt(cx - d)}" y1="${fmt(cy - d)}" x2="${fmt(cx + d)}" y2="${fmt(cy + d)}"/><line x1="${fmt(cx + d)}" y1="${fmt(cy - d)}" x2="${fmt(cx - d)}" y2="${fmt(cy + d)}"/></g>`;
    }
    case "star": {
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const outer = ((18 + i * 72) / 180) * Math.PI;
        const inner = ((54 + i * 72) / 180) * Math.PI;
        pts.push(`${fmt(cx + r * Math.cos(outer))},${fmt(cy - r * Math.sin(outer))}`);
        pts.push(`${fmt(cx + r * 0.4 * Math.cos(inner))},${fmt(cy - r * 0.4 * Math.sin(inner))}`);
      }
      return `<polygon points="${pts.join(" ")}" ${fillAttr}${strokeAttr}/>`;
    }
    case "circle":
    default:
      return `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" ${fillAttr}${strokeAttr}/>`;
  }
}
