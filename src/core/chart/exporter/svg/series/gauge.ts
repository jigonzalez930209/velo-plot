import type { Series } from "../../../../Series";
import type { PlotArea } from "../../../../../types";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { fmt, escapeXml } from "../SVGDocumentBuilder";

export function exportGaugeSeries(
  series: Series,
  plotArea: PlotArea,
  builder: SVGDocumentBuilder,
): void {
  const data = series.getGaugeData?.();
  const style = series.getGaugeStyle?.() ?? series.getStyle();
  if (!data) return;

  const cx = plotArea.x + plotArea.width / 2;
  const cy = plotArea.y + plotArea.height * 0.65;
  const radius = Math.min(plotArea.width, plotArea.height) * 0.35;
  const min = data.min ?? 0;
  const max = data.max ?? 100;
  const value = data.value ?? 0;
  const startAngle = Math.PI;
  const endAngle = 0;
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const arcPath = (r: number, a0: number, a1: number) => {
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${fmt(x0)} ${fmt(y0)} A ${fmt(r)} ${fmt(r)} 0 ${large} 1 ${fmt(x1)} ${fmt(y1)}`;
  };

  const trackColor = (style as { trackColor?: string }).trackColor ?? "#333";
  const fillColor = (style as { color?: string }).color ?? "#3b82f6";

  builder.push("series", `<path d="${arcPath(radius, startAngle, endAngle)}" fill="none" stroke="${trackColor}" stroke-width="12" stroke-linecap="round"/>`);

  const valueAngle = startAngle - t * Math.PI;
  builder.push("series", `<path d="${arcPath(radius, startAngle, valueAngle)}" fill="none" stroke="${fillColor}" stroke-width="12" stroke-linecap="round"/>`);

  const needleLen = radius - 8;
  const nx = cx + needleLen * Math.cos(valueAngle);
  const ny = cy - needleLen * Math.sin(valueAngle);
  builder.push("series", `<line x1="${fmt(cx)}" y1="${fmt(cy)}" x2="${fmt(nx)}" y2="${fmt(ny)}" stroke="${fillColor}" stroke-width="2"/>`);
  builder.push("series", `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="4" fill="${fillColor}"/>`);

  const label = (style as { label?: string }).label ?? `${value}`;
  builder.push(
    "series",
    `<text x="${fmt(cx)}" y="${fmt(cy + 30)}" fill="${fillColor}" font-size="18" font-weight="600" text-anchor="middle">${escapeXml(String(label))}</text>`,
  );
}
