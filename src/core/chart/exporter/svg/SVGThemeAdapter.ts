/**
 * Maps ChartTheme tokens to SVG stroke/fill attributes.
 */

import type { ChartTheme } from "../../../../theme";

export function dashArrayToSvg(dash: number[] | undefined): string | undefined {
  if (!dash || dash.length === 0) return undefined;
  return dash.join(",");
}

export interface SvgStrokeStyle {
  stroke: string;
  strokeWidth: number;
  strokeOpacity?: number;
  strokeDasharray?: string;
}

export interface SvgTextStyle {
  fill: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string | number;
}

export function gridMajorStyle(theme: ChartTheme): SvgStrokeStyle {
  return {
    stroke: theme.grid.majorColor,
    strokeWidth: theme.grid.majorWidth,
    strokeDasharray: dashArrayToSvg(theme.grid.majorDash),
  };
}

export function gridMinorStyle(theme: ChartTheme): SvgStrokeStyle {
  return {
    stroke: theme.grid.minorColor,
    strokeWidth: theme.grid.minorWidth,
    strokeDasharray: dashArrayToSvg(theme.grid.minorDash),
  };
}

export function axisLineStyle(theme: ChartTheme, orientation: "x" | "y"): SvgStrokeStyle {
  const axis = orientation === "x" ? theme.xAxis : theme.yAxis;
  return {
    stroke: axis.lineColor,
    strokeWidth: axis.lineWidth ?? 2,
  };
}

export function axisTickStyle(theme: ChartTheme, orientation: "x" | "y"): SvgStrokeStyle {
  const axis = orientation === "x" ? theme.xAxis : theme.yAxis;
  return {
    stroke: axis.tickColor,
    strokeWidth: 1,
  };
}

export function axisLabelStyle(theme: ChartTheme, orientation: "x" | "y"): SvgTextStyle {
  const axis = orientation === "x" ? theme.xAxis : theme.yAxis;
  return {
    fill: axis.labelColor,
    fontSize: axis.labelSize,
    fontFamily: axis.fontFamily || "sans-serif",
  };
}

export function strokeAttrs(style: SvgStrokeStyle): string {
  const parts = [
    `stroke="${style.stroke}"`,
    `stroke-width="${style.strokeWidth}"`,
  ];
  if (style.strokeOpacity !== undefined) parts.push(`stroke-opacity="${style.strokeOpacity}"`);
  if (style.strokeDasharray) parts.push(`stroke-dasharray="${style.strokeDasharray}"`);
  return parts.join(" ");
}

export function textAttrs(style: SvgTextStyle, anchor?: string, baseline?: string): string {
  const parts = [
    `fill="${style.fill}"`,
    `font-size="${style.fontSize}"`,
    `font-family="${style.fontFamily}"`,
  ];
  if (style.fontWeight) parts.push(`font-weight="${style.fontWeight}"`);
  if (anchor) parts.push(`text-anchor="${anchor}"`);
  if (baseline) parts.push(`dominant-baseline="${baseline}"`);
  return parts.join(" ");
}
