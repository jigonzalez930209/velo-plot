import type { SVGExportContext } from "../SVGExportContext";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { escapeXml, fmt } from "../SVGDocumentBuilder";
import { symbolSvg } from "../symbols";

export function exportLegend(ctx: SVGExportContext, builder: SVGDocumentBuilder): void {
  if (ctx.options.includeLegend === false) return;
  if (!ctx.showLegend && ctx.options.includeLegend !== true) return;

  const legend = ctx.theme.legend;
  if (!legend?.visible) return;

  const items = ctx.legendSeries;
  if (items.length === 0) return;

  const { plotArea } = ctx;
  const legendWidth = 160;
  const legendHeight =
    legend.padding * 2 + items.length * (legend.swatchSize + legend.itemGap) - legend.itemGap;

  let x = plotArea.x + plotArea.width - legendWidth - 10;
  let y = plotArea.y + 10;

  const position = legend.position ?? "top-right";
  if (position.includes("left")) x = plotArea.x + 10;
  if (position.includes("bottom")) y = plotArea.y + plotArea.height - legendHeight - 10;

  builder.push(
    "legend",
    `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(legendWidth)}" height="${fmt(legendHeight)}" fill="${legend.backgroundColor}" fill-opacity="0.8" stroke="${legend.borderColor ?? "transparent"}" rx="4"/>`,
  );

  items.forEach((series, i) => {
    const style = series.getStyle() as Record<string, unknown>;
    const color = (style.color as string) ?? "#fff";
    const opacity = (style.opacity as number) ?? 1;
    const itemY = y + legend.padding + i * (legend.swatchSize + legend.itemGap);
    const swatchX = x + legend.padding;
    const centerY = itemY + legend.swatchSize / 2;
    const centerX = swatchX + legend.swatchSize / 2;
    const size = legend.swatchSize;
    const type = String(series.getType()).toLowerCase();
    const symbol = (style.symbol as string) ?? "circle";

    if (type === "scatter" || type.includes("scatter")) {
      builder.push("legend", symbolSvg(symbol, centerX, centerY, size * 0.9, color, opacity));
      if (type.includes("+")) {
        builder.push(
          "legend",
          `<line x1="${fmt(swatchX)}" y1="${fmt(centerY)}" x2="${fmt(swatchX + size)}" y2="${fmt(centerY)}" stroke="${color}" stroke-width="2" stroke-opacity="${opacity}"/>`,
        );
      }
    } else {
      builder.push(
        "legend",
        `<line x1="${fmt(swatchX)}" y1="${fmt(centerY)}" x2="${fmt(swatchX + size)}" y2="${fmt(centerY)}" stroke="${color}" stroke-width="2" stroke-opacity="${opacity}"/>`,
      );
    }

    builder.push(
      "legend",
      `<text x="${fmt(x + legend.padding + legend.swatchSize + 8)}" y="${fmt(centerY + legend.fontSize * 0.35)}" fill="${legend.textColor}" font-size="${legend.fontSize}" font-family="${legend.fontFamily}">${escapeXml(series.getName())}</text>`,
    );
  });
}
