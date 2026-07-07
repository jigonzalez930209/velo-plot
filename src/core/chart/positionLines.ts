/**
 * Position lines — entry, stop-loss, take-profit (Stage 2.15).
 */

import type { Annotation } from "../annotations/types";

export type PositionLineStyle = "entry" | "sl" | "tp";

export interface PositionLineOptions {
  id?: string;
  price: number;
  label?: string;
  color?: string;
  style?: PositionLineStyle;
  interactive?: boolean;
}

const STYLE_COLORS: Record<PositionLineStyle, string> = {
  entry: "#38bdf8",
  sl: "#ef4444",
  tp: "#22c55e",
};

const STYLE_LABELS: Record<PositionLineStyle, string> = {
  entry: "Entry",
  sl: "SL",
  tp: "TP",
};

export function buildPositionLineAnnotation(
  options: PositionLineOptions,
  id: string,
): Annotation {
  const style = options.style ?? "entry";
  return {
    id,
    type: "horizontal-line",
    y: options.price,
    color: options.color ?? STYLE_COLORS[style],
    label: options.label ?? STYLE_LABELS[style],
    labelPosition: "right",
    lineDash: style === "sl" ? [6, 4] : style === "tp" ? [4, 4] : undefined,
    interactive: options.interactive ?? false,
  };
}
