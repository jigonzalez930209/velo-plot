import type { SVGExportContext } from "../SVGExportContext";
import type { SVGDocumentBuilder } from "../SVGDocumentBuilder";
import { escapeXml, fmt } from "../SVGDocumentBuilder";
import { axisLabelStyle, axisLineStyle, axisTickStyle, strokeAttrs, textAttrs } from "../SVGThemeAdapter";
import { resolveXTicks } from "../tickUtils";
import { formatXTickValue, formatYTickValue } from "../../../../format/axisFormat";
import { snapLabelCoord, snapLineCoord } from "../../../../render/pixelSnap";

export function exportAxes(ctx: SVGExportContext, builder: SVGDocumentBuilder): void {
  exportXAxis(ctx, builder);
  for (const layout of ctx.yAxisLayouts) {
    exportYAxis(ctx, builder, layout);
  }
}

function exportXAxis(ctx: SVGExportContext, builder: SVGDocumentBuilder): void {
  const { plotArea, xScale, theme, xAxisOptions } = ctx;
  if (xAxisOptions?.visible === false) return;
  const axis = theme.xAxis;
  const xTickCount = xAxisOptions?.tickCount ?? 8;
  const xTicks = resolveXTicks(xScale, xTickCount, ctx.businessDayMapping);
  const axisY = snapLineCoord(plotArea.y + plotArea.height);
  const showLine = xAxisOptions?.showLine !== false;
  const showTicks = xAxisOptions?.showTicks !== false;
  const showLabels = xAxisOptions?.showLabels !== false;
  const domainSpan = xScale.domain[1] - xScale.domain[0];

  if (showLine) {
    builder.push(
      "axes",
      `<line x1="${fmt(plotArea.x)}" y1="${fmt(axisY)}" x2="${fmt(plotArea.x + plotArea.width)}" y2="${fmt(axisY)}" ${strokeAttrs(axisLineStyle(theme, "x"))}/>`,
    );
  }

  const labelStyle = axisLabelStyle(theme, "x");
  const tickStyle = strokeAttrs(axisTickStyle(theme, "x"));

  const visibleTicks: Array<{ x: number; label: string }> = [];
  for (const tick of xTicks) {
    const x = snapLabelCoord(xScale.transform(tick));
    if (x >= plotArea.x && x <= plotArea.x + plotArea.width) {
      const label = showLabels ? formatXTickValue(tick, xAxisOptions, domainSpan, ctx.businessDayMapping ?? undefined) : "";
      if (!showLabels || label) visibleTicks.push({ x, label });
    }
  }

  let rotateLabels = false;
  if (showLabels && visibleTicks.length > 1) {
    const maxLabelLen = Math.max(...visibleTicks.map((t) => t.label.length));
    const approxWidth = maxLabelLen * axis.labelSize * 0.6;
    let minSpacing = Infinity;
    for (let i = 1; i < visibleTicks.length; i++) {
      minSpacing = Math.min(minSpacing, visibleTicks[i].x - visibleTicks[i - 1].x);
    }
    rotateLabels = approxWidth + 8 > minSpacing;
  }

  for (const item of visibleTicks) {
    if (showTicks) {
      builder.push(
        "axes",
        `<line x1="${fmt(item.x)}" y1="${fmt(axisY)}" x2="${fmt(item.x)}" y2="${fmt(axisY + axis.tickLength)}" ${tickStyle}/>`,
      );
    }
    if (showLabels && item.label) {
      const labelY = axisY + axis.tickLength + (rotateLabels ? 6 : 3) + axis.labelSize * 0.75;
      if (rotateLabels) {
        builder.push(
          "axes",
          `<text x="${fmt(item.x)}" y="${fmt(labelY)}" ${textAttrs(labelStyle, "end", "auto")} transform="rotate(-45 ${fmt(item.x)} ${fmt(labelY)})">${escapeXml(item.label)}</text>`,
        );
      } else {
        builder.push(
          "axes",
          `<text x="${fmt(item.x)}" y="${fmt(labelY)}" ${textAttrs(labelStyle, "middle")}>${escapeXml(item.label)}</text>`,
        );
      }
    }
  }

  const xLabel = xAxisOptions?.label;
  if (xLabel) {
    const titleY = plotArea.y + plotArea.height + (ctx.layout.xAxisLayout?.titleGap ?? 45);
    builder.push(
      "axes",
      `<text x="${fmt(plotArea.x + plotArea.width / 2)}" y="${fmt(titleY)}" ${textAttrs({ ...labelStyle, fill: axis.titleColor, fontSize: axis.titleSize }, "middle")}>${escapeXml(xLabel)}</text>`,
    );
  }
}

function exportYAxis(
  ctx: SVGExportContext,
  builder: SVGDocumentBuilder,
  layout: import("../SVGExportContext").YAxisLayoutEntry,
): void {
  const { plotArea, theme } = ctx;
  const { scale: yScale, options, position, offset } = layout;
  if (options?.visible === false) return;
  const axis = theme.yAxis;
  const yTickCount = options?.tickCount ?? 6;
  const yTicks = yScale.ticks(yTickCount);
  const showLine = options?.showLine !== false;
  const showTicks = options?.showTicks !== false;
  const showLabels = options?.showLabels !== false;
  const axisX = snapLineCoord(
    position === "left" ? plotArea.x - offset : plotArea.x + plotArea.width + offset,
  );
  const tickDir = position === "left" ? -1 : 1;

  if (showLine) {
    builder.push(
      "axes",
      `<line x1="${fmt(axisX)}" y1="${fmt(plotArea.y)}" x2="${fmt(axisX)}" y2="${fmt(plotArea.y + plotArea.height)}" ${strokeAttrs(axisLineStyle(theme, "y"))}/>`,
    );
  }

  const labelStyle = axisLabelStyle(theme, "y");
  const tickStyle = strokeAttrs(axisTickStyle(theme, "y"));

  for (const tick of yTicks) {
    const y = snapLabelCoord(yScale.transform(tick));
    if (y < plotArea.y || y > plotArea.y + plotArea.height) continue;

    if (showTicks) {
      builder.push(
        "axes",
        `<line x1="${fmt(axisX)}" y1="${fmt(y)}" x2="${fmt(axisX + axis.tickLength * tickDir)}" y2="${fmt(y)}" ${tickStyle}/>`,
      );
    }
    if (showLabels) {
      const labelX = axisX + (axis.tickLength + 3) * tickDir;
      const anchor = position === "left" ? "end" : "start";
      builder.push(
        "axes",
        `<text x="${fmt(labelX)}" y="${fmt(y + axis.labelSize * 0.35)}" ${textAttrs(labelStyle, anchor)}>${escapeXml(formatYTickValue(tick, options))}</text>`,
      );
    }
  }

  const label = options?.label;
  if (label) {
    const titleGap = ctx.layout.yAxisLayout?.titleGap ?? 50;
    const titleX = position === "left" ? axisX - titleGap : axisX + titleGap;
    const titleY = plotArea.y + plotArea.height / 2;
    const rotation = position === "left" ? -90 : 90;
    builder.push(
      "axes",
      `<text x="${fmt(titleX)}" y="${fmt(titleY)}" ${textAttrs({ ...labelStyle, fill: axis.titleColor, fontSize: axis.titleSize }, "middle")} transform="rotate(${rotation} ${fmt(titleX)} ${fmt(titleY)})">${escapeXml(label)}</text>`,
    );
  }
}
