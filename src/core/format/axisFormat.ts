/**
 * Shared axis tick and tooltip value formatting.
 */
import type { AxisOptions } from "../../types";

const PREFIXDivisors: Record<string, number> = {
  n: 1e-9,
  µ: 1e-6,
  m: 1e-3,
  "": 1,
  k: 1e3,
  M: 1e6,
};

export function autoPrefixFor(value: number): NonNullable<AxisOptions["prefix"]> {
  const absVal = Math.abs(value);
  if (absVal >= 1e6) return "M";
  if (absVal >= 1e3) return "k";
  if (absVal > 0 && absVal < 1e-6) return "n";
  if (absVal > 0 && absVal < 1e-3) return "µ";
  if (absVal > 0 && absVal < 1) return "m";
  return "";
}

export function applyPrefix(
  value: number,
  prefix: NonNullable<AxisOptions["prefix"]>,
): string {
  const resolved = prefix === "auto" ? autoPrefixFor(value) : prefix;
  const divisor = PREFIXDivisors[resolved] ?? 1;
  const scaled = value / divisor;
  return `${scaled.toPrecision(3)}${resolved}`;
}

export function pickTimeFormatter(spanMs: number): Intl.DateTimeFormat {
  if (spanMs <= 1000 * 60 * 60 * 36) {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (spanMs <= 1000 * 60 * 60 * 24 * 90) {
    return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "2-digit" });
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" });
}

export function formatTimeTick(value: number, spanMs?: number): string {
  const span = spanMs ?? 1000 * 60 * 60 * 24;
  return pickTimeFormatter(span).format(new Date(value));
}

export function toScientificUnicode(value: number, precision: number): string {
  const str = value.toExponential(precision);
  const [mantissa, exponent] = str.split("e");

  const superscriptMap: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "-": "⁻",
    "+": "⁺",
  };

  const unicodeExp = exponent
    .replace("+", "")
    .replace(/[0-9\-]/g, (char) => superscriptMap[char] || char);

  return `${mantissa}e${unicodeExp}`;
}

export function formatXTickValue(
  value: number,
  options?: AxisOptions,
  domainSpan?: number,
): string {
  if (options?.type === "time") {
    return formatTimeTick(value, domainSpan);
  }

  if (options?.prefix !== undefined && options.prefix !== "") {
    return applyPrefix(value, options.prefix);
  }

  const forceScientific = options?.scientific === true;
  const forceLinear = options?.scientific === false;
  const absVal = Math.abs(value);

  if (forceScientific || (!forceLinear && absVal !== 0 && absVal < 0.001)) {
    return toScientificUnicode(value, 1);
  }

  return value.toFixed(3).replace(/\.?0+$/, "");
}

export function formatYTickValue(value: number, options?: AxisOptions): string {
  if (value === 0) return "0";

  const forceScientific = options?.scientific === true;
  const forceLinear = options?.scientific === false;
  const absVal = Math.abs(value);

  if (options?.prefix !== undefined && options.prefix !== "") {
    return applyPrefix(value, options.prefix);
  }

  if (forceScientific || (!forceLinear && (absVal < 0.0001 || absVal >= 1e6))) {
    return toScientificUnicode(value, 1);
  }

  if (absVal >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  return value.toPrecision(3);
}

export interface TooltipAxisFormat {
  x?: Partial<AxisOptions>;
  y?: Partial<AxisOptions>;
  xSpan?: number;
}

export function formatTooltipX(value: number, axisFormat?: TooltipAxisFormat): string {
  return formatXTickValue(value, axisFormat?.x as AxisOptions | undefined, axisFormat?.xSpan);
}

export function formatTooltipY(value: number, axisFormat?: TooltipAxisFormat): string {
  return formatYTickValue(value, axisFormat?.y as AxisOptions | undefined);
}
