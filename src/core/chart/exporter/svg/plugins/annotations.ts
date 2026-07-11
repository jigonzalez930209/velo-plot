import type { Annotation } from "../../../../annotations/types";
import type { SVGExportPluginContext } from "./types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { escapeXml, fmt } from "../SVGDocumentBuilder";
import { primaryYScale } from "../tickUtils";

const arrowMarkers = new WeakMap<SVGDocumentBuilder, Map<string, string>>();

function arrowMarkerId(builder: SVGDocumentBuilder, color: string): string {
  let map = arrowMarkers.get(builder);
  if (!map) {
    map = new Map();
    arrowMarkers.set(builder, map);
  }
  let id = map.get(color);
  if (!id) {
    id = `vp-arrow-${map.size}`;
    builder.registerArrowMarker(id, color);
    map.set(color, id);
  }
  return id;
}

function dataToPixel(
  ctx: SVGExportPluginContext,
  x: number,
  y: number,
  yAxisId?: string,
): { px: number; py: number } {
  const yScale =
    (yAxisId && ctx.yScales.get(yAxisId)) || primaryYScale(ctx.yScales) || [...ctx.yScales.values()][0];
  if (!yScale) return { px: 0, py: 0 };
  return { px: ctx.xScale.transform(x), py: yScale.transform(y) };
}

export function exportAnnotationToSVG(annotation: Annotation, ctx: SVGExportPluginContext): string[] {
  if (annotation.visible === false) return [];
  const { plotArea } = ctx;
  const elements: string[] = [];
  const clipId = "vp-clip-ann";
  const clip = `clip-path="url(#${clipId})"`;

  switch (annotation.type) {
    case "horizontal-line": {
      const y = dataToPixel(ctx, 0, annotation.y).py;
      const x0 = ctx.xScale.transform(annotation.xMin ?? ctx.viewBounds.xMin);
      const x1 = ctx.xScale.transform(annotation.xMax ?? ctx.viewBounds.xMax);
      const color = annotation.color ?? "#ff0055";
      const dash = annotation.lineDash?.length ? ` stroke-dasharray="${annotation.lineDash.join(",")}"` : "";
      elements.push(
        `<line x1="${fmt(x0)}" y1="${fmt(y)}" x2="${fmt(x1)}" y2="${fmt(y)}" stroke="${color}" stroke-width="${annotation.lineWidth ?? 1}"${dash}/>`,
      );
      if (annotation.label) {
        const lx = annotation.labelPosition === "right" ? x1 - 4 : annotation.labelPosition === "left" ? x0 + 4 : (x0 + x1) / 2;
        elements.push(
          `<text x="${fmt(lx)}" y="${fmt(y - 4)}" fill="${color}" font-size="11" text-anchor="${annotation.labelPosition === "right" ? "end" : annotation.labelPosition === "left" ? "start" : "middle"}">${escapeXml(annotation.label)}</text>`,
        );
      }
      break;
    }
    case "vertical-line": {
      const x = dataToPixel(ctx, annotation.x, 0).px;
      const y0 = ctx.yScales.values().next().value!.transform(annotation.yMin ?? ctx.viewBounds.yMin);
      const y1 = ctx.yScales.values().next().value!.transform(annotation.yMax ?? ctx.viewBounds.yMax);
      const color = annotation.color ?? "#ff0055";
      elements.push(
        `<line x1="${fmt(x)}" y1="${fmt(Math.min(y0, y1))}" x2="${fmt(x)}" y2="${fmt(Math.max(y0, y1))}" stroke="${color}" stroke-width="${annotation.lineWidth ?? 1}"/>`,
      );
      break;
    }
    case "rectangle": {
      const p0 = dataToPixel(ctx, annotation.xMin, annotation.yMax);
      const p1 = dataToPixel(ctx, annotation.xMax, annotation.yMin);
      const x = Math.min(p0.px, p1.px);
      const y = Math.min(p0.py, p1.py);
      const w = Math.abs(p1.px - p0.px);
      const h = Math.abs(p1.py - p0.py);
      elements.push(
        `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${annotation.fillColor ?? "rgba(100,149,237,0.2)"}" stroke="${annotation.strokeColor ?? "#6495ed"}" stroke-width="${annotation.strokeWidth ?? 1}"/>`,
      );
      break;
    }
    case "band": {
      const yMin = annotation.yMin ?? ctx.viewBounds.yMin;
      const yMax = annotation.yMax ?? ctx.viewBounds.yMax;
      const y0 = dataToPixel(ctx, 0, yMin).py;
      const y1 = dataToPixel(ctx, 0, yMax).py;
      const top = Math.min(y0, y1);
      const height = Math.abs(y1 - y0);
      elements.push(
        `<rect x="${fmt(plotArea.x)}" y="${fmt(top)}" width="${fmt(plotArea.width)}" height="${fmt(height)}" fill="${annotation.fillColor ?? "rgba(100,149,237,0.15)"}"/>`,
      );
      break;
    }
    case "text": {
      const p = dataToPixel(ctx, annotation.x, annotation.y);
      const color = annotation.color ?? "#fff";
      const rotation = annotation.rotation ? ` transform="rotate(${annotation.rotation} ${fmt(p.px)} ${fmt(p.py)})"` : "";
      elements.push(
        `<text x="${fmt(p.px)}" y="${fmt(p.py)}" fill="${color}" font-size="${annotation.fontSize ?? 12}" font-family="${annotation.fontFamily ?? "sans-serif"}" text-anchor="middle"${rotation}>${escapeXml(annotation.text)}</text>`,
      );
      break;
    }
    case "arrow": {
      const from = dataToPixel(ctx, annotation.x1, annotation.y1);
      const to = dataToPixel(ctx, annotation.x2, annotation.y2);
      const color = annotation.color ?? "#ff0055";
      const markerId = ctx.builder ? arrowMarkerId(ctx.builder, color) : "vp-arrow";
      elements.push(
        `<line x1="${fmt(from.px)}" y1="${fmt(from.py)}" x2="${fmt(to.px)}" y2="${fmt(to.py)}" stroke="${color}" stroke-width="${annotation.lineWidth ?? 2}" marker-end="url(#${markerId})"/>`,
      );
      break;
    }
  }

  return elements.map((el) => `<g ${clip}>${el}</g>`);
}

export function exportAnnotations(ctx: SVGExportPluginContext, annotations: Annotation[]): void {
  if (!ctx.builder || !annotations.length) return;
  const { plotArea } = ctx;
  ctx.builder.registerClipPath(
    "vp-clip-ann",
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}"/>`,
  );

  const sorted = [...annotations].filter((a) => a.visible !== false).sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  for (const ann of sorted) {
    for (const el of exportAnnotationToSVG(ann, ctx)) {
      ctx.builder.push("plugins", el);
    }
  }
}
