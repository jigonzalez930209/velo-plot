import type { SVGExportContext } from "../SVGExportContext";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { escapeXml, fmt } from "../SVGDocumentBuilder";
import type { ChartTitleOptions } from "../../../../layout/types";

export function exportTitle(ctx: SVGExportContext, builder: SVGDocumentBuilder): void {
  const options = ctx.titleOptions;
  if (!options?.visible || !options.text) return;

  const { plotArea } = ctx;
  const fontSize = options.fontSize ?? 16;
  const fontFamily = options.fontFamily ?? "Inter, system-ui, sans-serif";
  const fontWeight = options.fontWeight ?? 600;
  const color = options.color ?? "#ffffff";
  const align = options.align ?? "center";

  let x: number;
  if (align === "left") x = plotArea.x;
  else if (align === "right") x = plotArea.x + plotArea.width;
  else x = plotArea.x + plotArea.width / 2;

  const padding = typeof options.padding === "number" ? options.padding : 10;
  const padTop = (options.padding as ChartTitleOptions["padding"] & { top?: number })?.top ?? padding;
  const padBottom = (options.padding as ChartTitleOptions["padding"] & { bottom?: number })?.bottom ?? padding;

  const y =
    options.position === "bottom"
      ? plotArea.y + plotArea.height + padBottom + fontSize
      : plotArea.y - padTop;

  const anchor = align === "left" ? "start" : align === "right" ? "end" : "middle";

  builder.push(
    "title",
    `<text x="${fmt(x)}" y="${fmt(y)}" fill="${color}" font-size="${fontSize}" font-family="${escapeXml(fontFamily)}" font-weight="${fontWeight}" text-anchor="${anchor}">${escapeXml(options.text)}</text>`,
  );
}
