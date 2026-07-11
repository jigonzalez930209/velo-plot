import type { SVGExportPluginContext } from "./types";
import { escapeXml, fmt } from "../SVGDocumentBuilder";

export function exportWatermark(
  ctx: SVGExportPluginContext,
  text: string,
  options?: { opacity?: number; rotation?: number; color?: string },
): void {
  if (!ctx.builder) return;
  const cx = ctx.plotArea.x + ctx.plotArea.width / 2;
  const cy = ctx.plotArea.y + ctx.plotArea.height / 2;
  const opacity = options?.opacity ?? 0.12;
  const rotation = options?.rotation ?? -30;
  const color = options?.color ?? "#ffffff";
  ctx.builder.push(
    "plugins",
    `<text x="${fmt(cx)}" y="${fmt(cy)}" fill="${color}" fill-opacity="${opacity}" font-size="48" font-weight="700" text-anchor="middle" transform="rotate(${rotation} ${fmt(cx)} ${fmt(cy)})">${escapeXml(text)}</text>`,
  );
}

export function exportGridHighlight(
  ctx: SVGExportPluginContext,
  bands: Array<{ axis: "x" | "y"; min: number; max: number; color?: string }>,
): void {
  if (!ctx.builder) return;
  const { plotArea } = ctx;
  const yScale = ctx.yScales.values().next().value;

  for (const band of bands) {
    const color = band.color ?? "rgba(59,130,246,0.1)";
    if (band.axis === "x") {
      const x0 = ctx.xScale.transform(band.min);
      const x1 = ctx.xScale.transform(band.max);
      ctx.builder.push(
        "plugins",
        `<rect x="${fmt(Math.min(x0, x1))}" y="${fmt(plotArea.y)}" width="${fmt(Math.abs(x1 - x0))}" height="${fmt(plotArea.height)}" fill="${color}"/>`,
      );
    } else if (yScale) {
      const y0 = yScale.transform(band.min);
      const y1 = yScale.transform(band.max);
      ctx.builder.push(
        "plugins",
        `<rect x="${fmt(plotArea.x)}" y="${fmt(Math.min(y0, y1))}" width="${fmt(plotArea.width)}" height="${fmt(Math.abs(y1 - y0))}" fill="${color}"/>`,
      );
    }
  }
}
