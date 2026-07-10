/**
 * Chart Type Definitions
 *
 * Interfaces for the Chart API and export options.
 */

import type {
  SeriesOptions,
  HeatmapOptions,
  SeriesUpdateData,
  ZoomOptions,
  CursorOptions,
  ChartEventMap,
  Bounds,
  AxisOptions,
  FitOptions,
} from "../../types";
import type { Series } from "../Series";
import type { Annotation } from "../annotations";
import type { ChartAnimationConfig } from "../animation";
import type { EventEmitter } from "../EventEmitter";

// Analysis types moved to plugin

// ============================================
// Chart Interface
// ============================================

export interface Chart {
  readonly events: EventEmitter<ChartEventMap>;
  addSeries(options: SeriesOptions | HeatmapOptions): void;
  addBar(options: Omit<SeriesOptions, "type">): void;
  addHeatmap(options: Omit<HeatmapOptions, "type">): void;
  removeSeries(id: string): void;
  updateSeries(id: string, data: SeriesUpdateData): void;
  getSeries(id: string): Series | undefined;
  getAllSeries(): Series[];
  appendData(
    id: string,
    x: number[] | Float32Array,
    y: number[] | Float32Array
  ): void;
  setAutoScroll(enabled: boolean): void;
  setMaxPoints(id: string, maxPoints: number): void;
  addFitLine(seriesId: string, type: any, options?: any): string;
  addIndicator(
    preset: import("../indicator/addIndicator").IndicatorPresetName,
    options?: import("../indicator/addIndicator").AddIndicatorOptions,
  ): Promise<import("../indicator/addIndicator").AddIndicatorResult>;
  addAlert(options: import("./ChartAlerts").PriceAlertOptions): string;
  removeAlert(id: string): boolean;
  clearAlerts(): void;
  getAlerts(): import("./ChartAlerts").PriceAlertOptions[];
  addPositionLine(options: import("./positionLines").PositionLineOptions): string;
  setDrawingMode(mode: import("../../plugins/drawing-tools").DrawingMode): void;
  zoom(options: ZoomOptions & { animate?: boolean }): void;
  /** Fit view to data; no-op when series have no valid bounds */
  fit(options?: FitOptions): void;
  /** Stable chart id for sync groups */
  getId(): string;
  pan(deltaX: number, deltaY: number): void;
  resetZoom(): void;
  getViewBounds(): Bounds;
  enableCursor(options: CursorOptions): void;
  disableCursor(): void;
  resize(width?: number, height?: number): void;
  /** Pause backing-store resize — canvases scale via CSS until cleared */
  setResizeSuspended?(suspended: boolean): void;
  /** Re-apply CSS canvas fill after pane flex changes during drag */
  syncDragLayout?(width?: number, height?: number): void;
  /** Get current device pixel ratio used for rendering */
  getDPR(): number;
  /** Actual renderer backend in use */
  getActiveRenderer(): "webgl" | "webgpu";
  /** Set device pixel ratio and trigger re-render */
  setDPR(dpr: number): void;
  /**
   * Lock the device pixel ratio to an explicit value (or clear with `null`).
   * Survives subsequent `resize()` calls; required for high-resolution export.
   */
  setDevicePixelRatioOverride?(dpr: number | null): void;
  render(): void;
  on<K extends keyof ChartEventMap>(
    event: K,
    handler: (data: ChartEventMap[K]) => void
  ): void;
  off<K extends keyof ChartEventMap>(
    event: K,
    handler: (data: ChartEventMap[K]) => void
  ): void;
  destroy(): void;
  exportImage(type?: "png" | "jpeg"): string;
  /** Vector export of series, axes, grid, and tick labels */
  exportSVG(): string;
  autoScale(animate?: boolean): void;
  setTheme(theme: string | object): void;
  /** Access to data analysis utilities */
  /** Access to the current active theme (scaled for responsiveness) */
  readonly theme: any;
  /** Access to the base theme (unscaled) */
  readonly baseTheme: any;
  readonly analysis: any;
  readonly animations: any;
  readonly regression: any;
  readonly radar: any;
  readonly ml: any;
  readonly snapshot: any;
  readonly dataExport: any;
  readonly roi: any;
  readonly videoRecorder: any;
  readonly offscreen: any;
  readonly virtualization: any;
  readonly themeEditor: any;
  readonly sync: any;
  readonly brokenAxis: any;
  readonly forecasting: any;

  // Annotation methods
  addAnnotation(annotation: Annotation): string;
  removeAnnotation(id: string): boolean;
  updateAnnotation(id: string, updates: Partial<Annotation>): void;
  getAnnotation(id: string): Annotation | undefined;
  getAnnotations(): Annotation[];
  clearAnnotations(): void;

  // Export methods
  exportCSV(options?: ExportOptions): string;
  exportJSON(options?: ExportOptions): string;

  /** Attach a plugin to extend chart functionality */
  use(plugin: ChartPlugin): void;

  /** Access to the tooltip system if the plugin is loaded */
  readonly tooltip?: any;

  // ============================================
  // Animation API
  // ============================================

  /** Animate view bounds to specific target */
  animateTo(options: {
    xRange?: [number, number];
    yRange?: [number, number];
    duration?: number;
    easing?: string;
  }): void;
  /** Get current animation configuration */
  getAnimationConfig(): ChartAnimationConfig;
  /** Update animation configuration */
  setAnimationConfig(config: Partial<ChartAnimationConfig>): void;
  /** Check if any animations are currently running */
  isAnimating(): boolean;

  // ============================================
  // Axis Management API
  // ============================================

  /** Add a new Y axis dynamically */
  addYAxis(options: AxisOptions): string;
  /** Remove a Y axis by ID */
  removeYAxis(id: string): boolean;
  /** Update Y axis configuration */
  updateYAxis(id: string, options: Partial<AxisOptions>): void;
  /** Update X axis configuration */
  updateXAxis(options: Partial<AxisOptions>): void;
  /** Get Y axis configuration by ID */
  getYAxis(id: string): AxisOptions | undefined;
  /** Get X axis configuration */
  getXAxis(): AxisOptions;
  /** Get all Y axes configurations */
  getAllYAxes(): AxisOptions[];
  /** Get the primary Y axis ID */
  getPrimaryYAxisId(): string;
  /** Update unified layout configuration */
  updateLayout(options: Partial<import("../layout").LayoutOptions>): void;

  // ============================================
  // Selection API
  // ============================================

  /** Select data points programmatically */
  selectPoints(
    points: Array<{ seriesId: string; indices: number[] }>,
    mode?: any
  ): void;
  /** Get all currently selected points */
  getSelectedPoints(): any[];
  /** Clear all selections */
  clearSelection(): void;
  /** Hit-test at a pixel coordinate */
  hitTest(
    pixelX: number,
    pixelY: number
  ): any | null;
  /** Check if a specific point is selected */
  isPointSelected(seriesId: string, index: number): boolean;
  /** Get selection count */
  getSelectionCount(): number;
  /** Configure selection behavior */
  configureSelection(
    config: any
  ): void;

  // ============================================
  // Interaction Mode
  // ============================================

  /** 
   * Set pan mode (true = pan, false = selection) 
   * @deprecated Use setMode('pan') or setMode('select') instead. **Removed in v4.0.**
   */
  setPanMode(enabled: boolean): void;

  /**
   * Set the interaction mode
   * @param mode - 'pan' for pan/drag, 'boxZoom' for rectangle zoom, 'select' for point selection
   */
  setMode(mode: 'pan' | 'boxZoom' | 'select' | 'delta' | 'peak'): void;

  /**
   * Get the current interaction mode
   */
  getMode(): 'pan' | 'boxZoom' | 'select' | 'delta' | 'peak';

  /**
   * Get the Delta Tool instance for advanced measurements
   */
  getDeltaTool(): any | null;

  /**
   * Get the Peak Tool instance for peak integration
   */
  getPeakTool(): any | null;

  /**
   * Get a plugin API by name
   */
  getPlugin<T = any>(name: string): T | null;

  /**
   * Get names of all registered plugins
   */
  getPluginNames(): string[];

  // ============================================
  // Responsive Design
  // ============================================

  /** Get current responsive state */
  getResponsiveState(): import("../responsive").ResponsiveState;
  /** Configure responsive behavior */
  configureResponsive(
    config: Partial<import("../responsive").ResponsiveConfig>
  ): void;
  /** Check if responsive mode is enabled */
  isResponsiveEnabled(): boolean;

  // ============================================
  // Serialization & Persistence
  // ============================================

  /** Export complete chart state */
  serialize(
    options?: import("../../serialization").SerializeOptions
  ): import("../../serialization").ChartState;
  /** Restore chart from saved state */
  deserialize(
    state: import("../../serialization").ChartState,
    options?: import("../../serialization").DeserializeOptions
  ): void;
  /** Convert current state to URL-safe hash */
  toUrlHash(compress?: boolean): string;
  /** Load state from URL hash */
  fromUrlHash(hash: string, compressed?: boolean): void;

  /** Set custom scales (e.g. for Broken Axis support) */
  setXScale(scale: any): void;
  setYScale(yAxisId: string, scale: any): void;

  /** Use a plugin */
  use(plugin: ChartPlugin | any): Promise<void>;
  /** Destroy the chart and cleanup resources */
  destroy(): void;
}

import { ChartPlugin } from "../../plugins/types";

export type { ChartPlugin };

/** Options for data export */
export interface ExportOptions {
  /** Series IDs to export (default: all) */
  seriesIds?: string[];
  /** Include headers in CSV (default: true) */
  includeHeaders?: boolean;
  /** Decimal precision (default: 6) */
  precision?: number;
  /** CSV delimiter (default: ',') */
  delimiter?: string;
}

// ============================================
// Layout Constants
// ============================================

export const MARGINS = { top: 20, right: 30, bottom: 55, left: 75 };
