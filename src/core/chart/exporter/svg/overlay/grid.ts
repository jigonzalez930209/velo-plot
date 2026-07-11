import type { SVGExportContext } from "../SVGExportContext";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt } from "../SVGDocumentBuilder";
import { gridMajorStyle, gridMinorStyle, strokeAttrs } from "../SVGThemeAdapter";
import { generateMinorTicks, primaryYScale, resolveGridXTicks } from "../tickUtils";
import { snapLineCoord } from "../../../../render/pixelSnap";

export function exportGrid(ctx: SVGExportContext, builder: SVGDocumentBuilder): void {
  if (!ctx.theme.grid.visible) return;

  const yScale = primaryYScale(ctx.yAxes, ctx.primaryYAxisId);
  if (!yScale) return;

  const { plotArea, xScale, theme } = ctx;
  const xTickCount = ctx.xAxisOptions?.tickCount ?? 8;
  const yTickCount = ctx.yAxisOptionsMap.get(ctx.primaryYAxisId ?? "default")?.tickCount ?? 6;
  const xTicks = resolveGridXTicks(xScale, xTickCount);
  const yTicks = yScale.ticks(yTickCount);
  const major = strokeAttrs(gridMajorStyle(theme));

  for (const tick of xTicks) {
    const x = snapLineCoord(xScale.transform(tick));
    if (x >= plotArea.x && x <= plotArea.x + plotArea.width) {
      builder.push(
        "grid",
        `<line x1="${fmt(x)}" y1="${fmt(plotArea.y)}" x2="${fmt(x)}" y2="${fmt(plotArea.y + plotArea.height)}" ${major}/>`,
      );
    }
  }

  for (const tick of yTicks) {
    const y = snapLineCoord(yScale.transform(tick));
    if (y >= plotArea.y && y <= plotArea.y + plotArea.height) {
      builder.push(
        "grid",
        `<line x1="${fmt(plotArea.x)}" y1="${fmt(y)}" x2="${fmt(plotArea.x + plotArea.width)}" y2="${fmt(y)}" ${major}/>`,
      );
    }
  }

  if (theme.grid.showMinor) {
    const minor = strokeAttrs(gridMinorStyle(theme));
    const minorXTicks = generateMinorTicks(xTicks, theme.grid.minorDivisions);
    const minorYTicks = generateMinorTicks(yTicks, theme.grid.minorDivisions);

    for (const tick of minorXTicks) {
      const x = snapLineCoord(xScale.transform(tick));
      if (x >= plotArea.x && x <= plotArea.x + plotArea.width) {
        builder.push(
          "grid",
          `<line x1="${fmt(x)}" y1="${fmt(plotArea.y)}" x2="${fmt(x)}" y2="${fmt(plotArea.y + plotArea.height)}" ${minor}/>`,
        );
      }
    }

    for (const tick of minorYTicks) {
      const y = snapLineCoord(yScale.transform(tick));
      if (y >= plotArea.y && y <= plotArea.y + plotArea.height) {
        builder.push(
          "grid",
          `<line x1="${fmt(plotArea.x)}" y1="${fmt(y)}" x2="${fmt(plotArea.x + plotArea.width)}" y2="${fmt(y)}" ${minor}/>`,
        );
      }
    }
  }
}
