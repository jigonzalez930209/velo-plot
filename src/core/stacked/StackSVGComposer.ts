/**
 * Composes multiple pane chart SVG exports into a single stacked SVG document.
 */

import type { Chart } from "../chart/types";
import { captureLayoutSnapshot } from "../chart/exporter/svg/SVGExportContext";
import { renderSVG } from "../chart/exporter/svg/SVGOrchestrator";
import type { StackSVGExportOptions } from "./types";

export interface StackSVGPaneLayout {
  chart: Chart;
  wrapper: HTMLElement;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

function relativeOffset(
  el: HTMLElement,
  containerRect: DOMRect,
): { x: number; y: number; width: number; height: number } {
  const r = el.getBoundingClientRect();
  return {
    x: r.left - containerRect.left,
    y: r.top - containerRect.top,
    width: r.width,
    height: r.height,
  };
}

export function buildStackPaneLayouts(
  container: HTMLDivElement,
  paneWrappers: HTMLDivElement[],
  paneCharts: Chart[],
): StackSVGPaneLayout[] {
  const containerRect = container.getBoundingClientRect();
  return paneWrappers.map((wrapper, i) => {
    const rect = relativeOffset(wrapper, containerRect);
    return {
      chart: paneCharts[i],
      wrapper,
      offsetX: rect.x,
      offsetY: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });
}

export function composeStackSVG(
  container: HTMLDivElement,
  paneWrappers: HTMLDivElement[],
  paneCharts: Chart[],
  dividers: HTMLElement[],
  options: StackSVGExportOptions = {},
): string {
  const containerRect = container.getBoundingClientRect();
  const outW = Math.max(1, Math.round(containerRect.width));
  const outH = Math.max(1, Math.round(containerRect.height));
  const bg = options.backgroundColor ?? paneCharts[0]?.theme?.backgroundColor ?? "#111111";
  const includeBg = options.includeBackground !== false;

  const layouts = buildStackPaneLayouts(container, paneWrappers, paneCharts);
  const parts: string[] = [
    `<svg width="${outW}" height="${outH}" viewBox="0 0 ${outW} ${outH}" xmlns="http://www.w3.org/2000/svg">`,
  ];

  if (includeBg) {
    parts.push(`<rect width="100%" height="100%" fill="${bg}"/>`);
  }

  for (const layout of layouts) {
    const chart = layout.chart as unknown as Parameters<typeof captureLayoutSnapshot>[0];
    const paneSvg = renderSVG(
      captureLayoutSnapshot(chart, {
        ...options,
        includeLegend: options.includeLegend ?? (chart as { showLegend?: boolean }).showLegend,
      }),
    );
    const inner = paneSvg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    parts.push(`<g transform="translate(${layout.offsetX.toFixed(1)},${layout.offsetY.toFixed(1)})">`);
    parts.push(inner);
    parts.push("</g>");
  }

  if (options.includeDividers !== false) {
    for (const divider of dividers) {
      const r = relativeOffset(divider, containerRect);
      const isHorizontal = r.height <= r.width;
      if (isHorizontal) {
        parts.push(
          `<line x1="${r.x.toFixed(1)}" y1="${(r.y + r.height / 2).toFixed(1)}" x2="${(r.x + r.width).toFixed(1)}" y2="${(r.y + r.height / 2).toFixed(1)}" stroke="rgba(128,128,128,0.5)" stroke-width="1"/>`,
        );
      } else {
        parts.push(
          `<line x1="${(r.x + r.width / 2).toFixed(1)}" y1="${r.y.toFixed(1)}" x2="${(r.x + r.width / 2).toFixed(1)}" y2="${(r.y + r.height).toFixed(1)}" stroke="rgba(128,128,128,0.5)" stroke-width="1"/>`,
        );
      }
    }
  }

  parts.push("</svg>");
  return parts.join("\n");
}

export function exportStackSVG(
  container: HTMLDivElement,
  paneWrappers: HTMLDivElement[],
  paneCharts: Chart[],
  dividers: HTMLElement[],
  backgroundColor: string,
  options: StackSVGExportOptions = {},
): string {
  return composeStackSVG(container, paneWrappers, paneCharts, dividers, {
    ...options,
    backgroundColor: options.backgroundColor ?? backgroundColor,
  });
}
