import type { SVGExportPluginContext } from "./types";
import { fmt } from "../SVGDocumentBuilder";

type BreakSymbol = "diagonal" | "zigzag" | "wave" | "simple";

function breakSymbolPath(x: number, y: number, type: BreakSymbol, edge: "top" | "bottom"): string {
  const size = 6;
  if (type === "diagonal") {
    return `M ${fmt(x - size)} ${fmt(y + size / 2)} L ${fmt(x + size)} ${fmt(y - size / 2)} M ${fmt(x - size + 3)} ${fmt(y + size / 2)} L ${fmt(x + size + 3)} ${fmt(y - size / 2)}`;
  }
  if (type === "zigzag") {
    return `M ${fmt(x - size)} ${fmt(y)} L ${fmt(x - size / 2)} ${fmt(y - size / 2)} L ${fmt(x + size / 2)} ${fmt(y + size / 2)} L ${fmt(x + size)} ${fmt(y)}`;
  }
  if (edge === "top" || edge === "bottom") {
    return `M ${fmt(x - size)} ${fmt(y - 2)} L ${fmt(x + size)} ${fmt(y + 2)} M ${fmt(x - size)} ${fmt(y - 6)} L ${fmt(x + size)} ${fmt(y - 2)}`;
  }
  return `M ${fmt(x - size)} ${fmt(y)} L ${fmt(x)} ${fmt(y - size)} L ${fmt(x + size)} ${fmt(y)}`;
}

export function exportBrokenAxisMarkers(
  ctx: SVGExportPluginContext,
  breaks: Array<{ axis: "x" | "y"; position: number; style?: BreakSymbol; color?: string }>,
): void {
  if (!ctx.builder) return;
  const { plotArea } = ctx;

  for (const brk of breaks) {
    const color = brk.color ?? ctx.theme.xAxis.lineColor;
    const symbol = brk.style ?? "diagonal";
    if (brk.axis === "x") {
      const x = ctx.xScale.transform(brk.position);
      const topY = plotArea.y;
      const bottomY = plotArea.y + plotArea.height;
      ctx.builder.push(
        "plugins",
        `<path d="${breakSymbolPath(x, topY, symbol, "top")}" fill="none" stroke="${color}" stroke-width="1.5"/>`,
      );
      ctx.builder.push(
        "plugins",
        `<path d="${breakSymbolPath(x, bottomY, symbol, "bottom")}" fill="none" stroke="${color}" stroke-width="1.5"/>`,
      );
    } else {
      const yScale = ctx.yScales.values().next().value;
      if (!yScale) continue;
      const y = yScale.transform(brk.position);
      const x = plotArea.x;
      const size = 6;
      ctx.builder.push(
        "plugins",
        `<path d="M ${fmt(x)} ${fmt(y - size)} L ${fmt(x + size)} ${fmt(y)} L ${fmt(x)} ${fmt(y + size)}" fill="none" stroke="${color}" stroke-width="1.5"/>`,
      );
    }
  }
}

/** Export breaks from PluginBrokenAxis config (data-space start/end). */
export function exportBrokenAxisFromConfig(
  ctx: SVGExportPluginContext,
  axes: Record<string, { breaks: Array<{ start: number; end: number; symbol?: BreakSymbol }>; defaultSymbol?: BreakSymbol; symbolColor?: string }>,
): void {
  const breaks: Array<{ axis: "x" | "y"; position: number; style?: BreakSymbol; color?: string }> = [];

  for (const [axisId, options] of Object.entries(axes)) {
    const horizontal = axisId === "default" || axisId === "xAxis";
    if (!horizontal) continue;
    for (const b of options.breaks) {
      breaks.push({
        axis: "x",
        position: (b.start + b.end) / 2,
        style: b.symbol ?? options.defaultSymbol,
        color: options.symbolColor,
      });
    }
  }

  exportBrokenAxisMarkers(ctx, breaks);
}
