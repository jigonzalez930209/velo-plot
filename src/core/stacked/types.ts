import type { Chart } from "../chart/types";
import type { ChartGroup } from "../sync";
import type { SyncAxis, SyncOptions } from "../sync";
import type { ChartOptions as RootChartOptions, Range, SeriesOptions } from "../../types";
import type { LayoutOptions } from "../layout";
import type { AddIndicatorResult } from "../indicator/addIndicator";

/** Stack layout direction */
export type StackDirection = "vertical" | "horizontal";

/** Per-pane configuration (max 5 panes per stack) */
export interface StackedPaneConfig {
  id: string;
  /** Flex ratio (e.g. 0.6) or CSS length ("24%", "80px") — height ratio when vertical, width ratio when horizontal */
  height: number | string;
  /** Chart options excluding container/id (series added via chart API or `series`) */
  chart?: Omit<RootChartOptions, "container" | "id">;
  /** Series to add immediately after pane chart is created */
  series?: SeriesOptions[];
  /** Show native X axis (default: only bottom pane when vertical + sharedXAxis; each pane when horizontal) */
  showXAxis?: boolean;
  /** Show native Y axis (default: only first pane when horizontal + sharedYAxis) */
  showYAxis?: boolean;
  /** Receive pan/zoom (default: true on every pane) */
  interactive?: boolean;
  /** Lock Y range — skips auto fit on Y for this pane */
  yRange?: Range | "auto";
}

export interface StackedChartOptions {
  /** Root container (will be cleared and filled with pane layout) */
  container: HTMLDivElement;
  /** 1–5 stacked panes */
  panes: StackedPaneConfig[];
  /** Layout direction (default: vertical — panes top to bottom) */
  direction?: StackDirection;
  /** Pane that drives sync (default: first pane) */
  masterPaneId?: string;
  /** Shared date/time row on bottom pane only (vertical layout) */
  sharedXAxis?: "bottom" | "none";
  /** Shared Y axis on left pane only (horizontal layout) */
  sharedYAxis?: "left" | "none";
  /**
   * Shared X-axis defaults applied to every pane (e.g. `type: 'time'`, timeScale).
   * Per-pane `chart.xAxis` overrides these. Visibility (labels/ticks/line) is still
   * controlled by `sharedXAxis` / `showXAxis`.
   */
  xAxis?: Omit<NonNullable<RootChartOptions["xAxis"]>, "showLabels" | "showTicks" | "showLine">;
  /** Shared theme applied to every pane */
  theme?: string | object;
  devicePixelRatio?: number;
  /** Gap between panes in CSS pixels (default: 0) */
  gap?: number;
  /** Enable VS Code–style drag resize between panes (default: false) */
  resizable?:
    | boolean
    | {
        /** Min pane height as fraction of available stack height (default: 1/6) */
        minPaneRatio?: number;
        /** Absolute min pane height in px — overrides ratio when larger */
        minPanePx?: number;
        dividerSize?: number;
      };
  /** Show legend on panes (default: false — set true on stack or per-pane chart) */
  showLegend?: boolean;
  /**
   * Pan/zoom sync between panes.
   * Default: X-axis sync via master pane (`axis: 'x'`, Y independent).
   * Pass `false` for fully independent panes.
   */
  sync?: boolean | StackedSyncOptions;
  /** Shared margin overrides — left/right aligned automatically across panes */
  layout?: Partial<LayoutOptions>;
}

export interface StackedChart {
  readonly container: HTMLDivElement;
  getPane(id: string): Chart | undefined;
  /**
   * @deprecated Prefer `getPane(id)`. Alias kept for docs / Trading Experience. **Removed in v4.0.**
   */
  getChart(id: string): Chart | undefined;
  getPanes(): Chart[];
  getMaster(): Chart;
  getGroup(): ChartGroup;
  fitAll(options?: { x?: Range; padding?: number }): void;
  resetAll(): void;
  resize(): void;
  /** Current flex ratios keyed by pane id */
  getPaneRatios(): Record<string, number>;
  /** Set flex ratios (same keys as pane ids); triggers resize */
  setPaneRatios(ratios: Record<string, number>): void;
  /** Sync axis mode: `x` (default), `y`, `xy`, or `none` */
  setSyncAxis(axis: SyncAxis): void;
  getSyncAxis(): SyncAxis;
  /** Update pan/zoom/cursor sync options at runtime */
  setSyncOptions(options: Partial<StackedSyncOptions>): void;
  /** Resolves when all pane charts have started rendering */
  whenReady(): Promise<void>;
  /** Append a pane at runtime (max 5 panes) */
  addPane(pane: StackedPaneConfig): Chart;
  /** Calculate + mount indicator pane or overlay on master price chart */
  addIndicator(
    preset: import("../indicator/addIndicator").IndicatorPresetName,
    options?: import("../indicator/addIndicator").AddIndicatorOptions,
  ): Promise<AddIndicatorResult & { paneId?: string; chart?: Chart }>;
  /** Export the entire stack as one PNG/JPEG/WebP image (WYSIWYG layout) */
  exportImage(options?: StackSnapshotOptions): Promise<string>;
  /** Alias for exportImage */
  snapshot(options?: StackSnapshotOptions): Promise<string>;
  destroy(): void;
}

export const STACKED_MAX_PANES = 5;
/** Default minimum pane height as a fraction of available stack height (1/6). */
export const STACKED_DEFAULT_MIN_PANE_RATIO = 1 / 6;
export const STACKED_COMPACT_MARGIN = { top: 4, bottom: 8, left: 4 };
export const STACKED_FULL_X_MARGIN = { bottom: 55 };
export const STACKED_FULL_Y_MARGIN = { left: 55 };

/** Options for full-stack image export */
export type StackSnapshotFormat = "png" | "jpeg" | "webp";
export type StackSnapshotResolution = "standard" | "2k" | "4k" | "8k" | number;

export interface StackSnapshotOptions {
  format?: StackSnapshotFormat;
  quality?: number;
  resolution?: StackSnapshotResolution;
  includeBackground?: boolean;
  includeDividers?: boolean;
  transparent?: boolean;
  download?: boolean;
  fileName?: string;
}

/** Pan/zoom sync between stacked panes (Y stays independent when axis is `x`). */
export type StackedSyncOptions = Pick<
  SyncOptions,
  | "axis"
  | "syncCursor"
  | "syncSelection"
  | "syncZoom"
  | "syncPan"
  | "bidirectional"
  | "debounce"
>;
