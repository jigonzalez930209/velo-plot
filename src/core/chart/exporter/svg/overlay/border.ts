import type { SVGExportContext } from "../SVGExportContext";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";

export function exportPlotBorder(ctx: SVGExportContext, builder: SVGDocumentBuilder): void {
  const { plotArea, theme } = ctx;
  builder.push(
    "border",
    `<rect x="${fmt(plotArea.x)}" y="${fmt(plotArea.y)}" width="${fmt(plotArea.width)}" height="${fmt(plotArea.height)}" fill="none" stroke="${theme.plotBorderColor}" stroke-width="1"/>`,
  );
}
