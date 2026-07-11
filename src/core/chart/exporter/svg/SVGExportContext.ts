/**
 * Immutable layout snapshot for SVG export — mirrors ChartRenderLoop state at capture time.
 */

import type { Series } from "../../../Series";
import type { Scale } from "../../../../scales";
import type { ChartTheme } from "../../../../theme";
import type {
  AxisOptions,
  Bounds,
  PlotArea,
} from "../../../../types";
import type { ChartTitleOptions } from "../../../layout/types";
import type { LayoutOptions } from "../../../layout";
import type { BusinessDayMapping } from "../../../time/TimeScale";
import type { SVGExportPluginContext } from "./plugins/types";
import { filterSeriesAtTimestamp } from "./seriesAtTimestamp";
import { reorderForHoveredSeries, syncScalesForRender } from "../../ChartRenderer";

export interface SVGExportOptions {
  xAxis?: AxisOptions;
  yAxis?: AxisOptions;
  primaryYAxisId?: string;
  /** Include plugin overlays (annotations, regression, etc.) */
  includeOverlays?: boolean;
  /** Include legend in SVG */
  includeLegend?: boolean;
  /** Include annotation plugin content */
  includeAnnotations?: boolean;
  /** Include crosshair at capture position */
  includeCursor?: boolean;
  /** Include selection rectangle */
  includeSelection?: boolean;
  /** Export state at specific timestamp (replay) */
  at?: number;
  /** Optional watermark text (snapshot / export) */
  watermarkText?: string;
  /** Embed web fonts in defs (P2) */
  embedFonts?: boolean;
  /** Accessible label for root SVG */
  ariaLabel?: string;
  /** 3D export mode — deferred */
  svgExport3DMode?: "raster" | "project";
  /** Legacy raster fallback during development */
  svgExportMode?: "vector" | "legacy-raster";
}

export interface YAxisLayoutEntry {
  id: string;
  scale: Scale;
  options?: AxisOptions;
  position: "left" | "right";
  offset: number;
}

export interface CursorSnapshot {
  x: number;
  y: number;
}

export interface SelectionSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PriceAlertSnapshot {
  price: number;
  direction?: string;
}

export interface SVGExportContext {
  series: Series[];
  viewBounds: Bounds;
  plotArea: PlotArea;
  xScale: Scale;
  yAxes: Map<string, Scale>;
  yAxisLayouts: YAxisLayoutEntry[];
  theme: ChartTheme;
  width: number;
  height: number;
  xAxisOptions?: AxisOptions;
  yAxisOptionsMap: Map<string, AxisOptions>;
  primaryYAxisId?: string;
  titleOptions?: ChartTitleOptions;
  layout: LayoutOptions;
  businessDayMapping?: BusinessDayMapping | null;
  showLegend: boolean;
  legendSeries: Series[];
  cursor?: CursorSnapshot | null;
  selection?: SelectionSnapshot | null;
  alerts?: PriceAlertSnapshot[];
  options: SVGExportOptions;
  pluginContexts: SVGExportPluginContext[];
  pluginManager?: {
    get: (name: string) => import("../../../../plugins/types").ChartPlugin | undefined;
    notifyExportSVG?: (ctx: SVGExportPluginContext) => void;
  };
}

export interface SVGExportInput {
  series: Series[];
  viewBounds: Bounds;
  plotArea: PlotArea;
  xScale: Scale;
  yAxes: Map<string, Scale>;
  theme: ChartTheme;
  width: number;
  height: number;
  options?: SVGExportOptions;
  xAxisOptions?: AxisOptions;
  yAxisOptionsMap?: Map<string, AxisOptions>;
  primaryYAxisId?: string;
  titleOptions?: ChartTitleOptions;
  layout?: LayoutOptions;
  businessDayMapping?: BusinessDayMapping | null;
  showLegend?: boolean;
  cursor?: CursorSnapshot | null;
  selection?: SelectionSnapshot | null;
  alerts?: PriceAlertSnapshot[];
  pluginContexts?: SVGExportPluginContext[];
  pluginManager?: SVGExportContext["pluginManager"];
}

/** Build Y-axis layout entries with left/right offsets matching OverlayRenderer. */
export function buildYAxisLayouts(
  _plotArea: PlotArea,
  yAxes: Map<string, Scale>,
  yAxisOptionsMap: Map<string, AxisOptions>,
  primaryYAxisId?: string,
): YAxisLayoutEntry[] {
  const entries: YAxisLayoutEntry[] = [];
  let leftOffset = 0;
  let rightOffset = 0;
  const axisWidth = 65;

  const ids = Array.from(yAxes.keys());
  const ordered = primaryYAxisId && ids.includes(primaryYAxisId)
    ? [primaryYAxisId, ...ids.filter((id) => id !== primaryYAxisId)]
    : ids;

  for (const id of ordered) {
    const scale = yAxes.get(id);
    if (!scale) continue;
    const opts = yAxisOptionsMap.get(id);
    const position = opts?.position === "right" ? "right" : "left";
    const offset = position === "left" ? leftOffset : rightOffset;
    entries.push({ id, scale, options: opts, position, offset });
    if (position === "left") leftOffset += axisWidth;
    else rightOffset += axisWidth;
  }

  return entries;
}

/** Avoid throwing when trading hooks are not registered (core bundle). */
function safeChartAlerts(
  chart: { getAlerts?: () => Array<{ price: number; direction?: string }> },
): Array<{ price: number; direction?: string }> | undefined {
  if (!chart.getAlerts) return undefined;
  try {
    return chart.getAlerts();
  } catch {
    return [];
  }
}

export function buildSVGExportContext(input: SVGExportInput): SVGExportContext {
  const yAxisOptionsMap = input.yAxisOptionsMap ?? new Map();
  const options = input.options ?? {};
  const yAxes = input.yAxes;

  if (yAxes.size === 0) {
    throw new Error("SVG export requires at least one Y scale");
  }

  return {
    series: input.series,
    viewBounds: input.viewBounds,
    plotArea: input.plotArea,
    xScale: input.xScale,
    yAxes,
    yAxisLayouts: buildYAxisLayouts(
      input.plotArea,
      yAxes,
      yAxisOptionsMap,
      options.primaryYAxisId ?? input.primaryYAxisId,
    ),
    theme: input.theme,
    width: input.width,
    height: input.height,
    xAxisOptions: input.xAxisOptions ?? options.xAxis,
    yAxisOptionsMap,
    primaryYAxisId: options.primaryYAxisId ?? input.primaryYAxisId,
    titleOptions: input.titleOptions,
    layout: input.layout ?? {},
    businessDayMapping: input.businessDayMapping,
    showLegend: input.showLegend ?? false,
    legendSeries: input.series.filter((s) => s.isVisible()),
    cursor: input.cursor,
    selection: input.selection,
    alerts: input.alerts,
    options,
    pluginContexts: input.pluginContexts ?? [],
    pluginManager: input.pluginManager,
  };
}

/** Capture layout snapshot from a live ChartImpl instance. */
export function captureLayoutSnapshot(chart: {
  getAllSeries: () => Series[];
  viewBounds: Bounds;
  getPlotArea: () => PlotArea;
  xScale: Scale;
  yScales: Map<string, Scale>;
  theme: ChartTheme;
  container: HTMLElement;
  xAxisOptions: AxisOptions;
  yAxisOptionsMap: Map<string, AxisOptions>;
  primaryYAxisId: string;
  getLayout?: () => LayoutOptions;
  getBusinessDayMapping?: () => BusinessDayMapping | null;
  showLegend?: boolean;
  getCursorPosition?: () => { x: number; y: number } | null;
  selectionRect?: { x: number; y: number; width: number; height: number } | null;
  getAlerts?: () => Array<{ price: number; direction?: string }>;
  getHoveredSeriesId?: () => string | null;
  pluginManager?: {
    get: (name: string) => unknown;
    notifyExportSVG?: (ctx: SVGExportPluginContext) => void;
  };
  titleOptions?: ChartTitleOptions;
}, exportOptions: SVGExportOptions = {}): SVGExportContext {
  const rect = chart.container.getBoundingClientRect();
  let series = chart.getAllSeries();
  const hoveredId = chart.getHoveredSeriesId?.() ?? null;
  series = reorderForHoveredSeries(series, hoveredId, (s) => s.getId());
  if (exportOptions.at != null && Number.isFinite(exportOptions.at)) {
    series = filterSeriesAtTimestamp(series, exportOptions.at);
  }

  const plotArea = chart.getPlotArea();
  syncScalesForRender(
    plotArea,
    chart.viewBounds,
    chart.xScale,
    chart.yScales,
    chart.yAxisOptionsMap,
    chart.xAxisOptions,
    chart.primaryYAxisId,
    chart.getLayout?.() ?? {},
  );

  return buildSVGExportContext({
    series,
    viewBounds: chart.viewBounds,
    plotArea,
    xScale: chart.xScale,
    yAxes: chart.yScales,
    theme: chart.theme,
    width: rect.width || chart.container.clientWidth,
    height: rect.height || chart.container.clientHeight,
    options: exportOptions,
    xAxisOptions: chart.xAxisOptions,
    yAxisOptionsMap: chart.yAxisOptionsMap,
    primaryYAxisId: chart.primaryYAxisId,
    titleOptions: chart.titleOptions ?? chart.getLayout?.()?.title,
    layout: chart.getLayout?.(),
    businessDayMapping: chart.getBusinessDayMapping?.() ?? null,
    showLegend: (chart as { showLegend?: boolean }).showLegend ?? false,
    cursor: chart.getCursorPosition?.() ?? null,
    selection: chart.selectionRect ?? null,
    alerts: safeChartAlerts(chart),
    pluginManager: chart.pluginManager as SVGExportContext["pluginManager"],
  });
}
