import type { Chart } from "../chart/types";

/** Adaptive Y tick count from pane height (~1 tick per 36px, capped by base). */
export function tickCountForPaneHeight(heightPx: number, base = 6): number {
  if (!Number.isFinite(heightPx) || heightPx <= 0) return base;
  const adaptive = Math.floor(heightPx / 36);
  return Math.max(2, Math.min(base, adaptive));
}

/** Adaptive X tick count from pane width. */
export function tickCountForPaneWidth(widthPx: number, base = 8): number {
  if (!Number.isFinite(widthPx) || widthPx <= 0) return base;
  const adaptive = Math.floor(widthPx / 72);
  return Math.max(2, Math.min(base, adaptive));
}

export interface PaneAxisMeta {
  chart: Chart;
  wrapper: HTMLDivElement;
  baseYTickCount: number;
  baseXTickCount: number;
  showXAxis: boolean;
}

export function readBaseYTickCount(yAxis?: { tickCount?: number } | { tickCount?: number }[]): number {
  if (!yAxis) return 6;
  const axes = Array.isArray(yAxis) ? yAxis : [yAxis];
  return axes[0]?.tickCount ?? 6;
}

export function adaptPaneAxes(meta: PaneAxisMeta): void {
  const h = meta.wrapper.clientHeight;
  const w = meta.wrapper.clientWidth;
  const yTicks = tickCountForPaneHeight(h, meta.baseYTickCount);

  meta.chart.updateYAxis("default", { tickCount: yTicks });

  if (meta.showXAxis) {
    const xTicks = tickCountForPaneWidth(w, meta.baseXTickCount);
    meta.chart.updateXAxis({ tickCount: xTicks });
  }
}

export function adaptAllPaneAxes(metas: PaneAxisMeta[]): void {
  for (const m of metas) adaptPaneAxes(m);
}
