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
  StackSnapshotOptions,
  StackDirection,
} from "./types";
import {
  STACKED_MAX_PANES,
  STACKED_COMPACT_MARGIN,
  STACKED_FULL_X_MARGIN,
} from "./types";
import { exportStackImage } from "./stackExport";
import { getInitQueueStatus } from "../ChartInitQueue";
import {
  addIndicatorToChart,
  buildIndicatorPaneFromPreset,
  type AddIndicatorOptions,
  type IndicatorPresetName,
} from "../indicator/addIndicator";
import { extractPriceSeries, resolveSourceSeries } from "../indicator/indicatorPresets";
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

// Pane ratios are always numeric (see initialPaneRatio), so this only handles
// the numeric flex-grow form.
function paneFlexStyle(ratio: number, direction: StackDirection): string {
  const minDim = direction === "horizontal" ? "min-width:0;" : "min-height:0;";
  // Grow factors must sum to ≥1 across siblings or free space stays empty
  // (CSS: grow < 1 only absorbs that fraction of free space).
  return `flex:${ratio} 1 0;${minDim}`;
}

/** Keep ratios summing to 1 so a lone pane always fills the host. */
function normalizePaneRatios(ratios: number[]): void {
  const sum = ratios.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const even = 1 / Math.max(1, ratios.length);
    for (let i = 0; i < ratios.length; i++) ratios[i] = even;
    return;
  }
  for (let i = 0; i < ratios.length; i++) ratios[i] /= sum;
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
  showYAxis: boolean,
  direction: StackDirection,
): Parameters<typeof createChart>[0] {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const isHorizontal = direction === "horizontal";
  const sharedBottom = !isHorizontal && stack.sharedXAxis !== "none";
  const compactX = sharedBottom && !showXAxis;
  const sharedLeft = isHorizontal && (stack.sharedYAxis ?? "left") !== "none";
  const compactY = sharedLeft && !showYAxis;
  const paneGap = stack.gap ?? 0;
  const compactMargin = paneGap > 0 ? STACKED_COMPACT_MARGIN : { top: 0, bottom: 0, left: 0 };

  const margins = isHorizontal
    ? {
        top: alignedMargins.top,
        right: isLast ? alignedMargins.right : compactMargin.left,
        left: compactY ? compactMargin.left : alignedMargins.left,
        bottom: alignedMargins.bottom,
      }
    : {
        top: isFirst ? alignedMargins.top : compactMargin.top,
        right: alignedMargins.right,
        left: alignedMargins.left,
        bottom: compactX
          ? compactMargin.bottom
          : isLast
            ? (stack.layout?.margins?.bottom ?? STACKED_FULL_X_MARGIN.bottom)
            : alignedMargins.bottom,
      };

  const baseX = {
    ...(stack.xAxis ?? {}),
    ...(pane.chart?.xAxis ?? {}),
  };
  const xAxis = {
    ...baseX,
    showLine: showXAxis ? baseX.showLine ?? true : false,
    showTicks: showXAxis ? baseX.showTicks ?? true : false,
    showLabels: showXAxis ? baseX.showLabels ?? true : false,
  };

  const baseY = pane.chart?.yAxis ?? {};
  const yAxisRaw = Array.isArray(baseY) ? baseY : [baseY];
  const yAxis = yAxisRaw.map((axis) => ({
    ...axis,
    showLine: showYAxis ? axis.showLine ?? true : false,
    showTicks: showYAxis ? axis.showTicks ?? true : false,
    showLabels: showYAxis ? axis.showLabels ?? true : false,
  }));
  const yAxisOption = Array.isArray(pane.chart?.yAxis) ? yAxis : yAxis[0];

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
    yAxis: yAxisOption,
    layout: mergeLayoutOptions({
      ...stack.layout,
      ...pane.chart?.layout,
      margins: { ...margins, ...stack.layout?.margins, ...pane.chart?.layout?.margins },
    }),
  };
}

function paneChartDivStyle(): string {
  return "position:absolute;inset:0;width:100%;height:100%;min-width:0;min-height:0;";
}

function wrapperStyle(ratio: number, gap: number, index: number, direction: StackDirection): string {
  const gapStyle =
    gap > 0 && index > 0
      ? direction === "horizontal"
        ? `margin-left:${gap}px;`
        : `margin-top:${gap}px;`
      : "";
  return `${paneFlexStyle(ratio, direction)}position:relative;overflow:hidden;${gapStyle}`;
}

function resolveStackSyncOptions(
  sync: StackedChartOptions["sync"],
  masterPaneId: string,
  direction: StackDirection,
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

  const defaultAxis: SyncOptions["axis"] = direction === "horizontal" ? "y" : "x";

  return {
    axis: defaultAxis,
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
  const direction: StackDirection = options.direction ?? "vertical";
  const isHorizontal = direction === "horizontal";
  const sharedXAxis = options.sharedXAxis ?? "bottom";
  const sharedYAxis = options.sharedYAxis ?? "left";
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

  // Capture host-owned size BEFORE mutating styles. Demos often set
  // style="height:480px" / CSS height on this same element.
  const hostInlineHeight = container.style.height;
  const hostInlineWidth = container.style.width;
  const hostInlineMinHeight = container.style.minHeight;
  const hostInlineMinWidth = container.style.minWidth;
  const computed = getComputedStyle(container);
  const measuredHeight =
    container.offsetHeight || parseInt(computed.height, 10) || 0;

  container.replaceChildren();
  // Fill the host box exactly — never invent a new size or freeze max-* during drag.
  // The host (inline style / CSS class / parent layout) owns width & height.
  container.style.display = "flex";
  container.style.flexDirection = isHorizontal ? "row" : "column";
  container.style.boxSizing = "border-box";
  container.style.overflow = "hidden";
  container.style.position = "relative";
  container.style.maxWidth = "none";
  container.style.maxHeight = "none";
  container.style.width = hostInlineWidth || "100%";
  container.style.minWidth = hostInlineMinWidth || "0";

  if (hostInlineHeight) {
    container.style.height = hostInlineHeight;
  } else if (measuredHeight > 0) {
    // CSS-class sized host: pin the measured height so flex children have a
    // definite size (plain height:100% collapses without an ancestor height).
    container.style.height = `${measuredHeight}px`;
  } else {
    container.style.height = "100%";
    container.style.minHeight = hostInlineMinHeight || "320px";
  }
  if (hostInlineMinHeight) container.style.minHeight = hostInlineMinHeight;
  else if (!container.style.minHeight) container.style.minHeight = "0";

  const paneIds = panes.map((p) => p.id);
  const paneRatios = panes.map((p) => initialPaneRatio(p.height));
  normalizePaneRatios(paneRatios);
  const paneCharts = new Map<string, Chart>();
  const paneWrappers: HTMLDivElement[] = [];
  const paneAxisMetas: PaneAxisMeta[] = [];
  let paneResizeCtrl: PaneResizeController | null = null;
  let isPaneDragging = false;
  let resizeRaf = 0;
  let dragLayoutRaf = 0;
  let pendingDragLayout: {
    sizes: number[];
    leadingIdx: number;
    trailingIdx: number;
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
      paneWrappers[i].style.cssText = wrapperStyle(paneRatios[i], gap, i, direction);
    }
  };

  const stackAvailSize = () => {
    const dividerTotal = (paneWrappers.length - 1) * resizeDividerSize;
    if (isHorizontal) {
      return Math.max(1, container.clientWidth - dividerTotal);
    }
    return Math.max(1, container.clientHeight - dividerTotal);
  };

  const restorePaneChartDivs = () => {
    for (const wrapper of paneWrappers) {
      const chartDiv = wrapper.firstElementChild as HTMLDivElement | null;
      if (chartDiv) {
        chartDiv.style.cssText = paneChartDivStyle();
      }
    }
  };

  const initDragSizes = (): number[] => {
    const avail = stackAvailSize();
    const measured = paneWrappers.map((w) =>
      isHorizontal ? w.getBoundingClientRect().width : w.getBoundingClientRect().height,
    );
    const sum = measured.reduce((s, h) => s + h, 0);
    if (sum <= 0) {
      const even = Math.floor(avail / Math.max(1, paneWrappers.length));
      return paneWrappers.map((_, i) =>
        i === paneWrappers.length - 1 ? avail - even * (paneWrappers.length - 1) : even,
      );
    }
    // Keep integer px that sum exactly to avail so panes always fill the host.
    return normalizePaneHeights(measured, avail);
  };

  const applyDragPaneSizes = (sizesPx: number[]) => {
    // Always redistribute inside the current host box — never grow/shrink it.
    const normalized = normalizePaneHeights(sizesPx, stackAvailSize());
    for (let i = 0; i < paneWrappers.length; i++) {
      const size = Math.max(1, normalized[i]);
      const gapStyle =
        gap > 0 && i > 0
          ? isHorizontal
            ? `margin-left:${gap}px;`
            : `margin-top:${gap}px;`
          : "";
      const dim = isHorizontal ? "width" : "height";
      paneWrappers[i].style.cssText = `${dim}:${size}px;flex:0 0 auto;min-height:0;min-width:0;position:relative;overflow:hidden;${gapStyle}`;
      const chartDiv = paneWrappers[i].firstElementChild as HTMLDivElement | null;
      if (chartDiv) chartDiv.style.cssText = paneChartDivStyle();
    }
    for (let i = 0; i < sizesPx.length; i++) sizesPx[i] = normalized[i];
  };

  const flushDragLayout = () => {
    dragLayoutRaf = 0;
    if (!isPaneDragging || !pendingDragLayout) return;

    const { sizes, leadingIdx, trailingIdx } = pendingDragLayout;
    applyDragPaneSizes(sizes);

    for (const i of [leadingIdx, trailingIdx]) {
      const chart = paneCharts.get(paneIds[i]);
      if (chart) {
        chart.resize();
        adaptAllPaneAxes([paneAxisMetas[i]]);
      }
    }
  };

  const scheduleDragLayout = (
    sizesPx: number[],
    leadingIdx: number,
    trailingIdx: number,
  ) => {
    pendingDragLayout = { sizes: sizesPx, leadingIdx, trailingIdx };
    if (dragLayoutRaf) return;
    dragLayoutRaf = requestAnimationFrame(flushDragLayout);
  };

  const syncRatiosFromSizes = (sizesPx: number[]) => {
    const total = sizesPx.reduce((s, h) => s + h, 0);
    if (total <= 0) return;
    const totalR = paneRatios.reduce((s, r) => s + r, 0);
    for (let i = 0; i < paneRatios.length; i++) {
      paneRatios[i] = (sizesPx[i] / total) * totalR;
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

  const alignedBottom = isHorizontal
    ? (options.layout?.margins?.bottom ?? STACKED_FULL_X_MARGIN.bottom)
    : MARGINS.bottom;

  for (let i = 0; i < panes.length; i++) {
    const pane = panes[i];
    const isFirst = i === 0;
    const isLast = i === panes.length - 1;

    const showXAxis = isHorizontal
      ? (pane.showXAxis ?? true)
      : (pane.showXAxis ?? (sharedXAxis === "bottom" ? isLast : true));

    const showYAxis = isHorizontal
      ? (pane.showYAxis ?? (sharedYAxis === "left" ? isFirst : true))
      : (pane.showYAxis ?? true);

    const wrapper = document.createElement("div");
    wrapper.dataset.paneId = pane.id;
    wrapper.style.cssText = wrapperStyle(paneRatios[i], gap, i, direction);

    const chartDiv = document.createElement("div");
    chartDiv.style.cssText = paneChartDivStyle();

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
          left: isHorizontal && !showYAxis ? MARGINS.left : alignedLeft,
          right: alignedRight,
          top: baseTop,
          bottom: alignedBottom,
        },
        showXAxis,
        showYAxis,
        direction,
      ),
    );
    // createChart may touch container styles — keep the absolute fill for flex panes.
    chartDiv.style.cssText = paneChartDivStyle();

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

  const rebuildPaneResize = () => {
    paneResizeCtrl?.destroy();
    paneResizeCtrl = null;
    if (!resizable || paneWrappers.length < 2) return;

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
        direction,
        ...resizeOpts,
        onDragStart: (leadingIdx, trailingIdx) => {
          isPaneDragging = true;
          setAllChartsResizeSuspended(true);
          setInactiveChartsResizeSuspended(leadingIdx, trailingIdx);
          return initDragSizes();
        },
        onDragMove: (sizes, leadingIdx, trailingIdx) => {
          scheduleDragLayout(sizes, leadingIdx, trailingIdx);
        },
        onDragEnd: (finalSizes) => {
          if (dragLayoutRaf) {
            cancelAnimationFrame(dragLayoutRaf);
            dragLayoutRaf = 0;
          }
          pendingDragLayout = null;
          isPaneDragging = false;
          const normalized = normalizePaneHeights(finalSizes, stackAvailSize());
          syncRatiosFromSizes(normalized);
          restorePaneChartDivs();
          applyFlexCss();
          setAllChartsResizeSuspended(false);
          commitPaneLayout();
        },
      },
    );
  };

  rebuildPaneResize();

  const master = paneCharts.get(masterPaneId);
  if (!master) {
    throw new Error(`[StackedChart] masterPaneId "${masterPaneId}" not found in panes`);
  }

  const group = createChartGroup(
    Array.from(paneCharts.values()),
    resolveStackSyncOptions(options.sync, masterPaneId, direction),
  );

  const getBackgroundColor = (): string => {
    const theme = master.theme ?? master.baseTheme;
    return theme?.backgroundColor ?? "#ffffff";
  };

  const waitForStackReady = (): Promise<void> => {
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
  };

  const runStackExport = async (opts: StackSnapshotOptions = {}): Promise<string> => {
    await waitForStackReady();
    for (const c of paneCharts.values()) c.render();
    await new Promise((r) => requestAnimationFrame(r));

    const dataUrl = await exportStackImage(
      container,
      paneWrappers,
      Array.from(paneCharts.values()),
      paneResizeCtrl?.dividers ?? [],
      getBackgroundColor(),
      opts,
    );

    if (opts.download) {
      const ext = opts.format === "jpeg" ? "jpg" : opts.format ?? "png";
      const link = document.createElement("a");
      link.download = `${opts.fileName ?? "velo-plot-stack"}.${ext}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return dataUrl;
  };

  const mountPane = (pane: StackedPaneConfig): Chart => {
    if (paneCharts.size >= STACKED_MAX_PANES) {
      throw new Error(`[StackedChart] Cannot exceed ${STACKED_MAX_PANES} panes`);
    }
    if (paneCharts.has(pane.id)) {
      throw new Error(`[StackedChart] Pane "${pane.id}" already exists`);
    }

    if (!isHorizontal && sharedXAxis === "bottom" && paneIds.length > 0) {
      const prevId = paneIds[paneIds.length - 1];
      const prevChart = paneCharts.get(prevId);
      const prevMeta = paneAxisMetas[paneAxisMetas.length - 1];
      // Hide shared X labels on the previous bottom pane and reclaim the
      // ~55px date-row margin so panes sit flush (no empty strip).
      prevChart?.updateXAxis({
        showLabels: false,
        showTicks: false,
        showLine: false,
      });
      prevChart?.updateLayout({
        margins: {
          bottom: gap > 0 ? STACKED_COMPACT_MARGIN.bottom : 0,
        },
      });
      if (prevMeta) prevMeta.showXAxis = false;
    }

    const newRatio = initialPaneRatio(pane.height ?? 0.25);
    const total = paneRatios.reduce((a, b) => a + b, 0);
    const scale = total > 0 ? (1 - newRatio) / total : 1;
    for (let j = 0; j < paneRatios.length; j++) paneRatios[j] *= scale;

    const index = paneIds.length;
    paneIds.push(pane.id);
    paneRatios.push(newRatio);
    normalizePaneRatios(paneRatios);

    const wrapper = document.createElement("div");
    wrapper.dataset.paneId = pane.id;
    wrapper.style.cssText = wrapperStyle(paneRatios[index], gap, index, direction);

    const chartDiv = document.createElement("div");
    chartDiv.style.cssText = paneChartDivStyle();
    wrapper.appendChild(chartDiv);
    container.appendChild(wrapper);
    paneWrappers.push(wrapper);

    // Rebalance flex on existing panes before createChart so the new
    // container has a non-zero size on first render (avoids zero-size overlay skip).
    applyFlexCss();

    const isLast = true;
    const showXAxis = isHorizontal
      ? (pane.showXAxis ?? true)
      : (pane.showXAxis ?? (sharedXAxis === "bottom" ? isLast : true));
    const showYAxis = isHorizontal
      ? (pane.showYAxis ?? (sharedYAxis === "left" ? index === 0 : true))
      : (pane.showYAxis ?? true);

    const chart = createChart(
      buildPaneChartOptions(
        pane,
        chartDiv,
        options,
        index,
        paneIds.length,
        {
          left: isHorizontal && !showYAxis ? MARGINS.left : alignedLeft,
          right: alignedRight,
          top: baseTop,
          bottom: alignedBottom,
        },
        showXAxis,
        showYAxis,
        direction,
      ),
    );
    chartDiv.style.cssText = paneChartDivStyle();

    const seriesList = expandPaneSeries(pane.series);
    for (const s of seriesList) chart.addSeries(s);
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

    group.add(chart);
    rebuildPaneResize();
    commitPaneLayout();
    return chart;
  };

  const stack: StackedChart = {
    container,
    getPane(id: string) {
      return paneCharts.get(id);
    },
    /** @deprecated Prefer `getPane(id)`. **Removed in v4.0.** */
    getChart(id: string) {
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
      applyPaneFlexRatios(paneWrappers, paneRatios, direction);
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
      return waitForStackReady();
    },
    exportImage(opts) {
      return runStackExport(opts);
    },
    snapshot(opts) {
      return runStackExport(opts);
    },
    addPane(pane: StackedPaneConfig): Chart {
      return mountPane(pane);
    },
    async addIndicator(preset: IndicatorPresetName, opts: AddIndicatorOptions = {}) {
      const priceChart = master;
      if (opts.pane !== "new") {
        const overlay = await addIndicatorToChart(priceChart, preset, opts);
        return { ...overlay, chart: priceChart };
      }

      const source = resolveSourceSeries(priceChart, opts.sourceSeriesId);
      const { x, prices } = extractPriceSeries(source);
      const paneConfig = await buildIndicatorPaneFromPreset(preset, x, prices, {
        id: opts.id ?? preset,
        label: opts.label ?? preset.toUpperCase(),
        height: opts.paneHeight ?? 0.25,
        showXAxis: opts.showXAxis,
        period: opts.period,
        fastPeriod: opts.fastPeriod,
        slowPeriod: opts.slowPeriod,
        signalPeriod: opts.signalPeriod,
        stdDev: opts.stdDev,
      }, source);

      const chart = mountPane(paneConfig);
      return {
        id: paneConfig.id,
        preset,
        placement: "oscillator" as const,
        seriesIds: paneConfig.series?.map((s) => s.id) ?? [],
        paneId: paneConfig.id,
        chart,
      };
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
