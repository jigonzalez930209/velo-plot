/**
 * Accessibility helpers for chart bindings.
 */

import type { Bounds } from "../../types";
import type { VeloPlotSeries } from "./types";
import { KeyBindingManager } from "../../core/keybindings";

export interface A11yOptions {
  label?: string;
  series?: VeloPlotSeries[];
  bounds?: Bounds | null;
  enableKeyboard?: boolean;
}

export interface A11yHandle {
  keyboard?: KeyBindingManager;
  srTable?: HTMLTableElement;
  cleanup: () => void;
}

const SR_ONLY_STYLE =
  "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";

export function buildAriaLabel(
  series: VeloPlotSeries[] = [],
  bounds?: Bounds | null,
  customLabel?: string,
): string {
  if (customLabel) return customLabel;
  const names = series.map((s) => s.name ?? s.id).join(", ");
  const range = bounds
    ? `X ${bounds.xMin.toFixed(2)} to ${bounds.xMax.toFixed(2)}, Y ${bounds.yMin.toFixed(2)} to ${bounds.yMax.toFixed(2)}`
    : "";
  return `Chart${names ? ` showing ${names}` : ""}${range ? `. Visible range: ${range}` : ""}`;
}

export function applyChartA11y(
  container: HTMLElement,
  chart: {
    resetZoom?: () => void;
    zoom?: (opts: { x?: [number, number]; y?: [number, number] }) => void;
    pan?: (dx: number, dy: number) => void;
    getViewBounds?: () => Bounds;
  },
  options: A11yOptions = {},
): A11yHandle {
  container.setAttribute("role", "img");
  container.setAttribute(
    "aria-label",
    buildAriaLabel(options.series, options.bounds, options.label),
  );
  container.setAttribute("tabindex", "0");

  let keyboard: KeyBindingManager | undefined;
  if (options.enableKeyboard !== false) {
    keyboard = new KeyBindingManager({
      target: container,
      callbacks: {
        onResetZoom: () => chart.resetZoom?.(),
        onPanLeft: () => chart.pan?.(-20, 0),
        onPanRight: () => chart.pan?.(20, 0),
        onPanUp: () => chart.pan?.(0, -20),
        onPanDown: () => chart.pan?.(0, 20),
        onZoomIn: () => {
          const b = chart.getViewBounds?.();
          if (!b) return;
          const dx = (b.xMax - b.xMin) * 0.1;
          const dy = (b.yMax - b.yMin) * 0.1;
          chart.zoom?.({
            x: [b.xMin + dx, b.xMax - dx],
            y: [b.yMin + dy, b.yMax - dy],
          });
        },
        onZoomOut: () => {
          const b = chart.getViewBounds?.();
          if (!b) return;
          const dx = (b.xMax - b.xMin) * 0.1;
          const dy = (b.yMax - b.yMin) * 0.1;
          chart.zoom?.({
            x: [b.xMin - dx, b.xMax + dx],
            y: [b.yMin - dy, b.yMax + dy],
          });
        },
        onEscape: () => chart.resetZoom?.(),
      },
    });
  }

  const srTable = document.createElement("table");
  srTable.className = "velo-plot-sr-only";
  srTable.setAttribute("aria-hidden", "false");
  srTable.style.cssText = SR_ONLY_STYLE;
  updateSrTable(srTable, options.series ?? [], options.bounds);
  container.appendChild(srTable);

  return {
    keyboard,
    srTable,
    cleanup: () => {
      keyboard?.destroy();
      srTable.remove();
    },
  };
}

export function updateA11y(
  container: HTMLElement,
  srTable: HTMLTableElement | undefined,
  options: A11yOptions,
): void {
  container.setAttribute(
    "aria-label",
    buildAriaLabel(options.series, options.bounds, options.label),
  );
  if (srTable) {
    updateSrTable(srTable, options.series ?? [], options.bounds);
  }
}

function updateSrTable(
  table: HTMLTableElement,
  series: VeloPlotSeries[],
  bounds?: Bounds | null,
): void {
  table.replaceChildren();
  const caption = document.createElement("caption");
  caption.textContent = "Chart data summary";
  table.appendChild(caption);

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const h of ["Series", "Points", "X range", "Y range"]) {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const s of series) {
    const tr = document.createElement("tr");
    const name = document.createElement("td");
    name.textContent = s.name ?? s.id;
    tr.appendChild(name);

    const points = document.createElement("td");
    if ("x" in s && s.x) {
      points.textContent = String(s.x.length);
    } else if (s.type === "heatmap") {
      points.textContent = String(s.data.zValues.length);
    } else {
      points.textContent = "0";
    }
    tr.appendChild(points);

    const xRange = document.createElement("td");
    xRange.textContent = bounds
      ? `${bounds.xMin.toFixed(2)} – ${bounds.xMax.toFixed(2)}`
      : "—";
    tr.appendChild(xRange);

    const yRange = document.createElement("td");
    yRange.textContent = bounds
      ? `${bounds.yMin.toFixed(2)} – ${bounds.yMax.toFixed(2)}`
      : "—";
    tr.appendChild(yRange);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
}
