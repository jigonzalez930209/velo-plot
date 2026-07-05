import { createChart } from "../Chart";
import type { Chart } from "../chart/types";
import { MARGINS } from "../chart/types";
import { createChartGroup } from "../sync";
import type { SyncOptions } from "../sync";
import type { AxisOptions, SeriesOptions } from "../../types";
import { mergeLayoutOptions } from "../layout";
import { buildIndicatorSeries } from "../indicator/buildIndicatorSeries";
import type { IndicatorSeriesOptions } from "../indicator/types";
import type {
  StackedChart,
  StackedChartOptions,
  StackedPaneConfig,
  StackedSyncOptions,
} from "./types";
import { STACKED_MAX_PANES, STACKED_COMPACT_MARGIN, STACKED_FULL_X_MARGIN } from "./types";
import { getInitQueueStatus } from "../ChartInitQueue";
import {
  attachPaneResize,
  applyPaneFlexRatios,
  initialPaneRatio,
  normalizePaneHeights,
  type PaneResizeController,
} from "./paneResize";
import {
  adaptAllPaneAxes,
  readBaseYTickCount,
  type PaneAxisMeta,
} from "./paneAxis";

function countYAxes(yAxis?: AxisOptions | AxisOptions[]): { left: number; right: number } {
  const axes = yAxis ? (Array.isArray(yAxis) ? yAxis : [yAxis]) : [{}];
  let left = 0;
  let right = 0;
  for (const a of axes) {
    if (a.position === "right") right++;
    else left++;
  }
  return { left: Math.max(1, left), right };
}

function computeAlignedLeftMargin(panes: StackedPaneConfig[], baseLeft: number): number {
  let maxExtra = 0;
  for (const pane of panes) {
    const { left } = countYAxes(pane.chart?.yAxis);
    maxExtra = Math.max(maxExtra, (left - 1) * 65);
  }
  return baseLeft + maxExtra;
}

function computeAlignedRightMargin(panes: StackedPaneConfig[], baseRight: number): number {
  let maxExtra = 0;
  for (const pane of panes) {
    const { right } = countYAxes(pane.chart?.yAxis);
    maxExtra = Math.max(maxExtra, right * 65);
  }
  return baseRight + maxExtra;
}

function paneFlexStyle(height: number | string): string {
  if (typeof height === "number") {
    return `flex:${height} 1 0;min-height:0;`;
  }
  return `flex:1 1 ${height};min-height:0;`;
}

function expandPaneSeries(series?: SeriesOptions[]): SeriesOptions[] {
  if (!series?.length) return [];
  const out: SeriesOptions[] = [];
  for (const s of series) {
    if (s.type === "indicator") {
      out.push(...buildIndicatorSeries(s as IndicatorSeriesOptions));
    } else {
      out.push(s);
    }
  }
  return out;
}

function buildPaneChartOptions(
  pane: StackedPaneConfig,
  chartContainer: HTMLDivElement,
  stack: StackedChartOptions,
  index: number,
  total: number,
  alignedMargins: { left: number; right: number; top: number; bottom: number },
  showXAxis: boolean,
): Parameters<typeof createChart>[0] {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const sharedBottom = stack.sharedXAxis !== "none";
  const compactX = sharedBottom && !showXAxis;
  const paneGap = stack.gap ?? 0;
  const compactMargin = paneGap > 0 ? STACKED_COMPACT_MARGIN : { top: 0, bottom: 0 };

  const margins = {
    top: isFirst ? alignedMargins.top : compactMargin.top,
    right: alignedMargins.right,
    left: alignedMargins.left,
    bottom: compactX
      ? compactMargin.bottom
      : isLast
        ? (stack.layout?.margins?.bottom ?? STACKED_FULL_X_MARGIN.bottom)
        : alignedMargins.bottom,
  };

  const baseX = pane.chart?.xAxis ?? {};
  const xAxis = {
    ...baseX,
    showLine: showXAxis ? baseX.showLine ?? true : false,
    showTicks: showXAxis ? baseX.showTicks ?? true : false,
    showLabels: showXAxis ? baseX.showLabels ?? true : false,
  };

  const isInteractive = pane.interactive ?? true;
  if (!isInteractive) {
    chartContainer.style.pointerEvents = "none";
  }

  return {
    ...pane.chart,
    id: pane.id,
    container: chartContainer,
    showLegend: pane.chart?.showLegend ?? stack.showLegend ?? false,
    theme: pane.chart?.theme ?? stack.theme,
    devicePixelRatio: stack.devicePixelRatio ?? pane.chart?.devicePixelRatio,
    loading: pane.chart?.loading ?? false,
    xAxis,
    layout: mergeLayoutOptions({
      ...stack.layout,
      ...pane.chart?.layout,
      margins: { ...margins, ...stack.layout?.margins, ...pane.chart?.layout?.margins },
    }),
  };
}

function wrapperStyle(ratio: number, gap: number, index: number): string {
  const marginTop = gap > 0 && index > 0 ? `margin-top:${gap}px;` : "";
  return `${paneFlexStyle(ratio)}position:relative;overflow:hidden;${marginTop}`;
}

function resolveStackSyncOptions(
  sync: StackedChartOptions["sync"],
  masterPaneId: string,
): SyncOptions {
  if (sync === false) {
    return {
      axis: "none",
      syncCursor: false,
      syncZoom: false,
      syncPan: false,
      bidirectional: true,
      masterId: undefined,
    };
  }

  return {
    axis: "x",
    bidirectional: true,
    masterId: masterPaneId,
    syncCursor: true,
    syncZoom: true,
    syncPan: true,
    ...(typeof sync === "object" ? sync : {}),
  };
}

export function createStackedChart(options: StackedChartOptions): StackedChart {
  const { container, panes } = options;
  if (!container) throw new Error("[StackedChart] container is required");
  if (panes.length < 1 || panes.length > STACKED_MAX_PANES) {
    throw new Error(`[StackedChart] panes must be 1–${STACKED_MAX_PANES}`);
  }

  const masterPaneId = options.masterPaneId ?? panes[0].id;
  const sharedXAxis = options.sharedXAxis ?? "bottom";
  const gap = options.gap ?? 0;
  const resizableOpt = options.resizable;
  const resizable = !!resizableOpt;
  const resizeDividerSize =
    typeof resizableOpt === "object" ? (resizableOpt.dividerSize ?? 6) : 6;

  const baseLayout = mergeLayoutOptions(options.layout);
  const baseLeft = baseLayout.margins?.left ?? MARGINS.left;
  const baseRight = baseLayout.margins?.right ?? MARGINS.right;
  const baseTop = baseLayout.margins?.top ?? MARGINS.top;
  const alignedLeft = computeAlignedLeftMargin(panes, baseLeft);
  const alignedRight = computeAlignedRightMargin(panes, baseRight);

  container.replaceChildren();
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.width = "100%";
  const existingHeight = container.offsetHeight || parseInt(getComputedStyle(container).height, 10);
  if (existingHeight > 0) {
    container.style.height = `${existingHeight}px`;
    container.style.minHeight = `${existingHeight}px`;
  } else if (!container.style.height) {
    container.style.minHeight = "320px";
  }
  container.style.overflow = "hidden";
  container.style.position = "relative";

  const paneIds = panes.map((p) => p.id);
  const paneRatios = panes.map((p) => initialPaneRatio(p.height));
  const paneCharts = new Map<string, Chart>();
  const paneWrappers: HTMLDivElement[] = [];
  const paneAxisMetas: PaneAxisMeta[] = [];
  let paneResizeCtrl: PaneResizeController | null = null;
  let isPaneDragging = false;
  let resizeRaf = 0;
  let dragLayoutRaf = 0;
  let pendingDragLayout: {
    heights: number[];
    topIdx: number;
    bottomIdx: number;
  } | null = null;

  const commitPaneLayout = (affected?: number[]) => {
    const indices =
      affected ??
      Array.from({ length: paneWrappers.length }, (_, i) => i);

    for (const i of indices) {
      const chart = paneCharts.get(paneIds[i]);
      if (chart) {
        chart.resize();
      }
    }
    adaptAllPaneAxes(
      indices.map((i) => paneAxisMetas[i]).filter(Boolean),
    );
  };

  const scheduleStackResize = () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      if (isPaneDragging) return;
      commitPaneLayout();
    });
  };

  const resizeObserver = new ResizeObserver(() => {
    if (isPaneDragging) return;
    scheduleStackResize();
  });
  resizeObserver.observe(container);

  const applyFlexCss = () => {
    for (let i = 0; i < paneWrappers.length; i++) {
      const marginTop = gap > 0 && i > 0 ? `margin-top:${gap}px;` : "";
      paneWrappers[i].style.cssText = `${paneFlexStyle(paneRatios[i])}position:relative;overflow:hidden;${marginTop}`;
    }
  };

  const stackAvailHeight = () => {
    const dividerTotal = (paneWrappers.length - 1) * resizeDividerSize;
    return Math.max(1, container.clientHeight - dividerTotal);
  };

  const restorePaneChartDivs = () => {
    for (const wrapper of paneWrappers) {
      const chartDiv = wrapper.firstElementChild as HTMLDivElement | null;
      if (chartDiv) {
        chartDiv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
      }
    }
  };

  const initDragHeights = (): number[] => {
    const avail = stackAvailHeight();
    const measured = paneWrappers.map((w) => w.getBoundingClientRect().height);
    const sum = measured.reduce((s, h) => s + h, 0);
    return sum > 0 ? measured.map((h) => h * (avail / sum)) : measured;
  };

  const applyDragPaneHeights = (heightsPx: number[]) => {
    for (let i = 0; i < paneWrappers.length; i++) {
      const h = Math.max(1, Math.round(heightsPx[i]));
      const marginTop = gap > 0 && i > 0 ? `margin-top:${gap}px;` : "";
      paneWrappers[i].style.cssText = `height:${h}px;flex:0 0 auto;min-height:0;position:relative;overflow:hidden;${marginTop}`;
    }
  };

  const flushDragLayout = () => {
    dragLayoutRaf = 0;
    if (!isPaneDragging || !pendingDragLayout) return;

    const { heights, topIdx, bottomIdx } = pendingDragLayout;
    applyDragPaneHeights(heights);

    for (const i of [topIdx, bottomIdx]) {
      const chart = paneCharts.get(paneIds[i]);
      if (chart) {
        chart.resize();
        adaptAllPaneAxes([paneAxisMetas[i]]);
      }
    }
  };

  const scheduleDragLayout = (
    heightsPx: number[],
    topIdx: number,
    bottomIdx: number,
  ) => {
    pendingDragLayout = { heights: heightsPx, topIdx, bottomIdx };
    if (dragLayoutRaf) return;
    dragLayoutRaf = requestAnimationFrame(flushDragLayout);
  };

  const syncRatiosFromHeights = (heightsPx: number[]) => {
    const totalH = heightsPx.reduce((s, h) => s + h, 0);
    if (totalH <= 0) return;
    const totalR = paneRatios.reduce((s, r) => s + r, 0);
    for (let i = 0; i < paneRatios.length; i++) {
      paneRatios[i] = (heightsPx[i] / totalH) * totalR;
    }
  };

  const setAllChartsResizeSuspended = (suspended: boolean) => {
    for (const chart of paneCharts.values()) {
      chart.setResizeSuspended?.(suspended);
    }
  };

  const setInactiveChartsResizeSuspended = (
    topIdx: number,
    bottomIdx: number,
  ) => {
    for (let i = 0; i < paneIds.length; i++) {
      if (i === topIdx || i === bottomIdx) continue;
      paneCharts.get(paneIds[i])?.setResizeSuspended?.(true);
    }
    paneCharts.get(paneIds[topIdx])?.setResizeSuspended?.(false);
    paneCharts.get(paneIds[bottomIdx])?.setResizeSuspended?.(false);
  };

  for (let i = 0; i < panes.length; i++) {
    const pane = panes[i];
    const isLast = i === panes.length - 1;
    const showXAxis =
      pane.showXAxis ?? (sharedXAxis === "bottom" ? isLast : true);

    const wrapper = document.createElement("div");
    wrapper.dataset.paneId = pane.id;
    wrapper.style.cssText = wrapperStyle(paneRatios[i], gap, i);

    const chartDiv = document.createElement("div");
    chartDiv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";

    wrapper.appendChild(chartDiv);
    container.appendChild(wrapper);
    paneWrappers.push(wrapper);

    const chart = createChart(
      buildPaneChartOptions(
        pane,
        chartDiv,
        options,
        i,
        panes.length,
        {
          left: alignedLeft,
          right: alignedRight,
          top: baseTop,
          bottom: MARGINS.bottom,
        },
        showXAxis,
      ),
    );

    const seriesList = expandPaneSeries(pane.series);
    if (seriesList.length) {
      for (const s of seriesList) chart.addSeries(s);
    }

    if (pane.yRange && pane.yRange !== "auto") {
      chart.zoom({ y: pane.yRange, animate: false });
    }

    paneCharts.set(pane.id, chart);

    paneAxisMetas.push({
      chart,
      wrapper,
      baseYTickCount: readBaseYTickCount(pane.chart?.yAxis),
      baseXTickCount: pane.chart?.xAxis?.tickCount ?? 8,
      showXAxis,
    });
  }

  if (resizable && panes.length > 1) {
    const resizeOpts =
      typeof resizableOpt === "object"
        ? {
            minPaneRatio: resizableOpt.minPaneRatio,
            minPanePx: resizableOpt.minPanePx,
            dividerSize: resizableOpt.dividerSize,
          }
        : {};
    paneResizeCtrl = attachPaneResize(
      container,
      paneWrappers,
      paneIds,
      paneRatios,
      {
        ...resizeOpts,
        onDragStart: (topIdx, bottomIdx) => {
          isPaneDragging = true;
          setAllChartsResizeSuspended(true);
          setInactiveChartsResizeSuspended(topIdx, bottomIdx);
          return initDragHeights();
        },
        onDragMove: (heights, topIdx, bottomIdx) => {
          scheduleDragLayout(heights, topIdx, bottomIdx);
        },
        onDragEnd: (finalHeights) => {
          if (dragLayoutRaf) {
            cancelAnimationFrame(dragLayoutRaf);
            dragLayoutRaf = 0;
          }
          pendingDragLayout = null;
          isPaneDragging = false;
          const normalized = normalizePaneHeights(finalHeights, stackAvailHeight());
          syncRatiosFromHeights(normalized);
          restorePaneChartDivs();
          applyFlexCss();
          setAllChartsResizeSuspended(false);
          commitPaneLayout();
        },
      },
    );
  }

  const master = paneCharts.get(masterPaneId);
  if (!master) {
    throw new Error(`[StackedChart] masterPaneId "${masterPaneId}" not found in panes`);
  }

  const group = createChartGroup(
    Array.from(paneCharts.values()),
    resolveStackSyncOptions(options.sync, masterPaneId),
  );

  const stack: StackedChart = {
    container,
    getPane(id: string) {
      return paneCharts.get(id);
    },
    getPanes() {
      return Array.from(paneCharts.values());
    },
    getMaster() {
      return master;
    },
    getGroup() {
      return group;
    },
    fitAll(opts) {
      group.fitAll(opts);
    },
    resetAll() {
      group.resetAll();
    },
    resize() {
      commitPaneLayout();
    },
    getPaneRatios() {
      const out: Record<string, number> = {};
      for (let i = 0; i < paneIds.length; i++) {
        out[paneIds[i]] = paneRatios[i];
      }
      return out;
    },
    setPaneRatios(ratios: Record<string, number>) {
      for (let i = 0; i < paneIds.length; i++) {
        const id = paneIds[i];
        if (ratios[id] !== undefined) paneRatios[i] = ratios[id];
      }
      applyPaneFlexRatios(paneWrappers, paneRatios);
      commitPaneLayout();
    },
    setSyncAxis(axis) {
      group.syncAxis(axis);
    },
    getSyncAxis() {
      return group.getOptions().axis ?? "x";
    },
    setSyncOptions(syncOpts: Partial<StackedSyncOptions>) {
      group.updateOptions(syncOpts);
    },
    whenReady() {
      const maxWait = 8000;
      const started = Date.now();

      const waitForInitQueue = (): Promise<void> =>
        new Promise((resolve) => {
          const poll = () => {
            const q = getInitQueueStatus();
            if ((q.pending === 0 && !q.isProcessing) || Date.now() - started > maxWait) {
              resolve();
              return;
            }
            setTimeout(poll, 50);
          };
          poll();
        });

      return waitForInitQueue().then(() => {
        return new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            commitPaneLayout();
            resolve();
          });
        });
      });
    },
    destroy() {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      if (dragLayoutRaf) cancelAnimationFrame(dragLayoutRaf);
      resizeObserver.disconnect();
      paneResizeCtrl?.destroy();
      group.destroy();
      for (const c of paneCharts.values()) c.destroy();
      paneCharts.clear();
      container.replaceChildren();
    },
  };

  return stack;
}
