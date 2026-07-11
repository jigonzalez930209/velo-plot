import type { SVGExportPluginContext } from "./types";
import { escapeXml, fmt } from "../SVGDocumentBuilder";

/** LaTeX labels via foreignObject (phase 1 strategy per roadmap). */
export function exportLatexText(
  ctx: SVGExportPluginContext,
  text: string,
  x: number,
  y: number,
  options: { fontSize?: number; color?: string; width?: number; height?: number },
): void {
  if (!ctx.builder) return;
  const fontSize = options.fontSize ?? 14;
  const color = options.color ?? "#fff";
  const w = options.width ?? 200;
  const h = options.height ?? 40;
  ctx.builder.push(
    "plugins",
    `<foreignObject x="${fmt(x)}" y="${fmt(y - h / 2)}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:${fontSize}px;color:${color}">\\(${escapeXml(text)}\\)</div></foreignObject>`,
  );
}
