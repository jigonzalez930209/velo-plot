import type { SVGExportPluginContext } from "./types";
import { fmt } from "../SVGDocumentBuilder";
import { primaryYScale } from "../tickUtils";

export interface RoiExportRegion {
  tool: "rectangle" | "circle" | "polygon" | "lasso";
  points: Array<{ x: number; y: number }>;
  color?: string;
  fill?: string;
}

export function exportRoiRegions(ctx: SVGExportPluginContext, regions: RoiExportRegion[]): void {
  if (!ctx.builder || regions.length === 0) return;

  const yScale = primaryYScale(ctx.yScales);
  if (!yScale) return;

  const toPx = (p: { x: number; y: number }) => ({
    x: ctx.xScale.transform(p.x),
    y: yScale.transform(p.y),
  });

  for (const region of regions) {
    const stroke = region.color ?? "#00f2ff";
    const fill = region.fill ?? "rgba(0, 242, 255, 0.15)";
    const pixels = region.points.map(toPx);
    if (pixels.length < 2) continue;

    if (region.tool === "rectangle") {
      const x = Math.min(pixels[0].x, pixels[1].x);
      const y = Math.min(pixels[0].y, pixels[1].y);
      const w = Math.abs(pixels[1].x - pixels[0].x);
      const h = Math.abs(pixels[1].y - pixels[0].y);
      ctx.builder.push(
        "plugins",
        `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
      );
    } else if (region.tool === "circle") {
      const dx = pixels[1].x - pixels[0].x;
      const dy = pixels[1].y - pixels[0].y;
      const r = Math.sqrt(dx * dx + dy * dy);
      ctx.builder.push(
        "plugins",
        `<circle cx="${fmt(pixels[0].x)}" cy="${fmt(pixels[0].y)}" r="${fmt(r)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
      );
    } else if (region.tool === "polygon" || region.tool === "lasso") {
      const pts = pixels.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(" ");
      ctx.builder.push(
        "plugins",
        `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
      );
    }
  }
}
