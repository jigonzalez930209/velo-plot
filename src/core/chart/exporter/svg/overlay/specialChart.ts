import type { Series } from "../../../../Series";
import type { SVGExportContext } from "../SVGExportContext";

export interface SpecialChartInfo {
  isSpecialChart: boolean;
  hasPolarSeries: boolean;
  hasGaugeSeries: boolean;
  hasSankeySeries: boolean;
  maxRadius: number;
  polarAngleMode: "degrees" | "radians";
  polarRadialDivisions: number;
  polarAngularDivisions: number;
}

export function detectSpecialChart(series: Series[]): SpecialChartInfo {
  let hasPolarSeries = false;
  let hasGaugeSeries = false;
  let hasSankeySeries = false;
  let maxRadius = 0;
  let polarAngleMode: "degrees" | "radians" = "degrees";
  let polarRadialDivisions = 5;
  let polarAngularDivisions = 12;

  for (const s of series) {
    if (!s.isVisible()) continue;
    const type = s.getType();
    if (type === "polar") {
      hasPolarSeries = true;
      const polarData = s.getPolarData?.();
      if (polarData) {
        for (let i = 0; i < polarData.r.length; i++) {
          maxRadius = Math.max(maxRadius, Math.abs(polarData.r[i]));
        }
        const style = s.getStyle() as {
          angleMode?: "degrees" | "radians";
          radialDivisions?: number;
          angularDivisions?: number;
        };
        if (style.angleMode) polarAngleMode = style.angleMode;
        if (style.radialDivisions) polarRadialDivisions = style.radialDivisions;
        if (style.angularDivisions) polarAngularDivisions = style.angularDivisions;
      }
    } else if (type === "gauge") {
      hasGaugeSeries = true;
    } else if (type === "sankey") {
      hasSankeySeries = true;
    }
  }

  return {
    isSpecialChart: hasPolarSeries || hasGaugeSeries || hasSankeySeries,
    hasPolarSeries,
    hasGaugeSeries,
    hasSankeySeries,
    maxRadius,
    polarAngleMode,
    polarRadialDivisions,
    polarAngularDivisions,
  };
}

export function detectSpecialChartFromContext(ctx: SVGExportContext): SpecialChartInfo {
  return detectSpecialChart(ctx.series);
}
