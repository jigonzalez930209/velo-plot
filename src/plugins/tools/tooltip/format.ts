/**
 * Shared tooltip value formatting — delegates to axisFormat when axis context exists.
 */
import type { DataPointTooltip, CrosshairTooltip } from "./types";
import { formatTooltipX, formatTooltipY } from "../../../core/format/axisFormat";

export function formatDataPointX(data: DataPointTooltip): string {
  if (data.axisFormat) return formatTooltipX(data.dataX, data.axisFormat);
  return formatFallbackNumber(data.dataX);
}

export function formatDataPointY(data: DataPointTooltip): string {
  if (data.axisFormat) return formatTooltipY(data.dataY, data.axisFormat);
  return formatFallbackNumber(data.dataY);
}

export function formatCrosshairX(data: CrosshairTooltip): string {
  if (data.axisFormat) return formatTooltipX(data.dataX, data.axisFormat);
  return formatFallbackNumber(data.dataX);
}

export function formatCrosshairY(value: number, data: CrosshairTooltip): string {
  if (data.axisFormat) return formatTooltipY(value, data.axisFormat);
  return formatFallbackNumber(value);
}

function formatFallbackNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  const absVal = Math.abs(value);
  if (absVal === 0) return "0";
  if (absVal < 0.0001 || absVal >= 10000) return value.toExponential(2);
  if (absVal < 0.01) return value.toPrecision(4);
  if (absVal < 1) return value.toFixed(4);
  if (absVal < 100) return value.toFixed(3);
  return value.toFixed(1);
}

export function formatCompactValue(data: DataPointTooltip, axis: "x" | "y"): string {
  const value = axis === "x" ? data.dataX : data.dataY;
  if (data.axisFormat) {
    return axis === "x"
      ? formatTooltipX(value, data.axisFormat)
      : formatTooltipY(value, data.axisFormat);
  }
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  const absVal = Math.abs(value);
  if (absVal === 0) return "0";
  if (absVal >= 1e9) return (value / 1e9).toFixed(1) + "G";
  if (absVal >= 1e6) return (value / 1e6).toFixed(1) + "M";
  if (absVal >= 1e3) return (value / 1e3).toFixed(1) + "k";
  if (absVal >= 1) return value.toFixed(2);
  if (absVal >= 1e-3) return (value * 1e3).toFixed(1) + "m";
  if (absVal >= 1e-6) return (value * 1e6).toFixed(1) + "µ";
  if (absVal >= 1e-9) return (value * 1e9).toFixed(1) + "n";
  return value.toExponential(1);
}
