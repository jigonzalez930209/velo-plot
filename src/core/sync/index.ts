/**
 * Velo Plot - Chart Synchronization Module
 *
 * @module sync
 */

import type { Bounds, Range } from "../../types";

export type SyncAxis = 'x' | 'y' | 'xy' | 'none';

export interface SyncOptions {
  axis?: SyncAxis;
  syncCursor?: boolean;
  syncSelection?: boolean;
  syncZoom?: boolean;
  syncPan?: boolean;
  debounce?: number;
  bidirectional?: boolean;
  /** When set, used for fitAll; with bidirectional sync any pane can drive pan/zoom */
  masterId?: string;
}

export interface ChartLike {
  getId(): string;
  getViewBounds(): Bounds;
  zoom(options: { x?: Range; y?: Range; animate?: boolean }): void;
  pan(dx: number, dy: number): void;
  fit?(options?: { x?: Range; y?: Range; padding?: number | { x?: number; y?: number } }): void;
  getCursorPosition?(): { x: number; y: number } | null;
  setExternalCursor?(x: number, y: number): void;
  clearExternalCursor?(): void;
  getSelectedPoints?(): { seriesId: string; indices: number[] }[];
  selectPoints?(points: { seriesId: string; indices: number[] }[]): void;
  clearSelection?(): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
}

export interface SyncEvent {
  sourceId: string;
  type: 'zoom' | 'pan' | 'cursor' | 'selection' | 'bounds';
  data: unknown;
}

type RequiredSyncOptions = Required<Omit<SyncOptions, 'masterId'>> & Pick<SyncOptions, 'masterId'>;

export class ChartGroup {
  private charts: Map<string, ChartLike> = new Map();
  private options: RequiredSyncOptions;
  private eventHandlers: Map<string, Map<string, (...args: unknown[]) => void>> = new Map();
  private isUpdating: boolean = false;
  private debounceTimers: Map<string, number> = new Map();
  private rafTimers: Map<string, number> = new Map();

  constructor(options?: SyncOptions) {
    this.options = {
      axis: 'x',
      syncCursor: true,
      syncSelection: false,
      syncZoom: true,
      syncPan: true,
      debounce: 0,
      bidirectional: true,
      masterId: undefined,
      ...options,
    };
  }

  add(chart: ChartLike): this {
    const chartId = chart.getId();
    if (this.charts.has(chartId)) {
      console.warn(`[ChartGroup] Chart ${chartId} is already in the group`);
      return this;
    }
    this.charts.set(chartId, chart);
    this.attachEventHandlers(chart);
    return this;
  }

  addAll(...charts: ChartLike[]): this {
    for (const chart of charts) this.add(chart);
    return this;
  }

  remove(chart: ChartLike): this {
    const chartId = chart.getId();
    if (!this.charts.has(chartId)) return this;
    this.detachEventHandlers(chart);
    this.charts.delete(chartId);
    return this;
  }

  getCharts(): ChartLike[] {
    return Array.from(this.charts.values());
  }

  size(): number {
    return this.charts.size;
  }

  has(chart: ChartLike): boolean {
    return this.charts.has(chart.getId());
  }

  syncAxis(axis: SyncAxis): this {
    this.options.axis = axis;
    return this;
  }

  syncZoom(enabled: boolean): this {
    if (this.options.syncZoom === enabled) return this;
    return this.updateOptions({ syncZoom: enabled });
  }

  syncPan(enabled: boolean): this {
    if (this.options.syncPan === enabled) return this;
    return this.updateOptions({ syncPan: enabled });
  }

  syncCursor(enabled: boolean): this {
    this.options.syncCursor = enabled;
    return this;
  }

  syncSelection(enabled: boolean): this {
    this.options.syncSelection = enabled;
    return this;
  }

  /** Update sync options and re-bind event handlers on all charts */
  updateOptions(partial: Partial<SyncOptions>): this {
    Object.assign(this.options, partial);
    for (const chart of this.charts.values()) {
      this.detachEventHandlers(chart);
      this.attachEventHandlers(chart);
    }
    return this;
  }

  getOptions(): Readonly<SyncOptions> {
    return { ...this.options };
  }

  syncTo(bounds: Partial<Bounds>, excludeChartId?: string): void {
    this.propagateZoom(excludeChartId || '', bounds);
  }

  resetAll(): void {
    this.batch(() => {
      for (const chart of this.charts.values()) {
        if (chart.fit) chart.fit();
        else chart.zoom({ x: undefined, y: undefined });
      }
    });
  }

  fitAll(options?: { x?: Range; padding?: number }): void {
    this.batch(() => {
      let sharedX: Range | undefined = options?.x;
      const masterId = this.options.masterId;
      const master = masterId ? this.charts.get(masterId) : this.charts.values().next().value;

      if (!sharedX && master?.fit) {
        master.fit({ padding: options?.padding });
        const b = master.getViewBounds();
        if (this.hasValidViewBounds(b)) sharedX = [b.xMin, b.xMax];
      }

      for (const [chartId, chart] of this.charts.entries()) {
        if (!chart.fit) continue;
        if (chartId === masterId) continue;
        chart.fit(
          sharedX
            ? { x: sharedX, padding: options?.padding }
            : { padding: options?.padding },
        );
      }
    });
  }

  batch<T>(fn: () => T): T {
    const prev = this.isUpdating;
    this.isUpdating = true;
    try {
      return fn();
    } finally {
      this.isUpdating = prev;
    }
  }

  clearAllSelections(): void {
    for (const chart of this.charts.values()) {
      chart.clearSelection?.();
    }
  }

  destroy(): void {
    for (const chart of this.charts.values()) {
      this.detachEventHandlers(chart);
    }
    this.charts.clear();
    this.eventHandlers.clear();
    for (const timerId of this.debounceTimers.values()) clearTimeout(timerId);
    this.debounceTimers.clear();
    for (const rafId of this.rafTimers.values()) cancelAnimationFrame(rafId);
    this.rafTimers.clear();
  }

  private isSyncSource(chartId: string): boolean {
    if (this.options.bidirectional) return true;
    if (this.options.masterId) return chartId === this.options.masterId;
    return true;
  }

  private hasValidViewBounds(bounds: Bounds): boolean {
    const xSpan = bounds.xMax - bounds.xMin;
    const ySpan = bounds.yMax - bounds.yMin;
    if (!Number.isFinite(xSpan) || !Number.isFinite(ySpan)) return false;
    if (xSpan <= 0 && ySpan <= 0) return false;
    return true;
  }

  private attachEventHandlers(chart: ChartLike): void {
    const chartId = chart.getId();
    const handlers = new Map<string, (...args: unknown[]) => void>();

    if (this.options.syncZoom && this.isSyncSource(chartId)) {
      const zoomHandler = (...args: unknown[]) => {
        this.handleZoom(chartId, args[0] as { x: Range; y: Range });
      };
      chart.on('zoom', zoomHandler);
      handlers.set('zoom', zoomHandler);
    }

    if (this.options.syncPan && this.isSyncSource(chartId)) {
      const panHandler = (...args: unknown[]) => {
        this.handlePan(chartId, args[0] as { deltaX: number; deltaY: number });
      };
      chart.on('pan', panHandler);
      handlers.set('pan', panHandler);
    }

    if (this.options.syncCursor) {
      const hoverHandler = (...args: unknown[]) => {
        this.handleCursor(chartId, args[0] as { point?: { x: number; y: number } } | null);
      };
      chart.on('hover', hoverHandler);
      handlers.set('hover', hoverHandler);
    }

    if (this.options.syncSelection) {
      const selectionHandler = (...args: unknown[]) => {
        this.handleSelection(chartId, args[0] as { selected: unknown[] });
      };
      chart.on('selectionChange', selectionHandler);
      handlers.set('selectionChange', selectionHandler);
    }

    this.eventHandlers.set(chartId, handlers);
  }

  private detachEventHandlers(chart: ChartLike): void {
    const chartId = chart.getId();
    const handlers = this.eventHandlers.get(chartId);
    if (!handlers) return;
    for (const [event, handler] of handlers.entries()) {
      chart.off(event, handler);
    }
    this.eventHandlers.delete(chartId);
  }

  private handleZoom(sourceId: string, event: { x: Range; y: Range }): void {
    if (this.isUpdating) return;
    // No canPropagateFrom guard needed: zoom handlers are only attached to sync
    // sources (see attachEventHandlers + isSyncSource), which use identical logic.

    const sourceChart = this.charts.get(sourceId);
    if (sourceChart && !this.hasValidViewBounds(sourceChart.getViewBounds())) return;

    const bounds: Partial<Bounds> = {};
    if (this.options.axis === 'x' || this.options.axis === 'xy') {
      bounds.xMin = event.x[0];
      bounds.xMax = event.x[1];
    }
    if (this.options.axis === 'y' || this.options.axis === 'xy') {
      bounds.yMin = event.y[0];
      bounds.yMax = event.y[1];
    }

    if (bounds.xMin !== undefined && bounds.xMax !== undefined) {
      const xSpan = bounds.xMax - bounds.xMin;
      if (!Number.isFinite(xSpan) || xSpan <= 0) return;
    }

    this.scheduleSyncAction(`zoom-${sourceId}`, () => {
      this.propagateZoom(sourceId, bounds);
    });
  }

  private handlePan(sourceId: string, event: { deltaX: number; deltaY: number }): void {
    if (this.isUpdating) return;
    // Pan handlers are only attached to sync sources (see attachEventHandlers).

    const dx = (this.options.axis === 'x' || this.options.axis === 'xy') ? event.deltaX : 0;
    const dy = (this.options.axis === 'y' || this.options.axis === 'xy') ? event.deltaY : 0;
    if (dx === 0 && dy === 0) return;

    this.scheduleSyncAction(`pan-${sourceId}`, () => {
      this.propagatePan(sourceId, dx, dy);
    });
  }

  private handleCursor(sourceId: string, event: { point?: { x: number; y: number } } | null): void {
    if (this.isUpdating) return;
    for (const [chartId, chart] of this.charts.entries()) {
      if (chartId === sourceId) continue;
      if (event?.point) chart.setExternalCursor?.(event.point.x, event.point.y);
      else chart.clearExternalCursor?.();
    }
  }

  private handleSelection(sourceId: string, event: { selected: unknown[] }): void {
    if (this.isUpdating || !this.options.syncSelection) return;

    const sourceChart = this.charts.get(sourceId);
    if (!sourceChart) return;

    const selected =
      (event?.selected as { seriesId: string; indices: number[] }[]) ??
      sourceChart.getSelectedPoints?.() ??
      [];

    this.isUpdating = true;
    try {
      for (const [chartId, chart] of this.charts.entries()) {
        if (chartId === sourceId) continue;
        if (selected.length === 0) {
          chart.clearSelection?.();
        } else {
          chart.selectPoints?.(selected);
        }
      }
    } finally {
      this.isUpdating = false;
    }
  }

  private propagateZoom(sourceId: string, bounds: Partial<Bounds>): void {
    if (this.isUpdating) return;
    this.isUpdating = true;
    try {
      for (const [chartId, chart] of this.charts.entries()) {
        if (chartId === sourceId) continue;
        const zoomOptions: { x?: Range; y?: Range; animate?: boolean } = { animate: false };
        if (bounds.xMin !== undefined && bounds.xMax !== undefined) {
          zoomOptions.x = [bounds.xMin, bounds.xMax];
        }
        if (bounds.yMin !== undefined && bounds.yMax !== undefined) {
          zoomOptions.y = [bounds.yMin, bounds.yMax];
        }
        chart.zoom(zoomOptions);
      }
    } finally {
      this.isUpdating = false;
    }
  }

  private propagatePan(sourceId: string, _dx: number, _dy: number): void {
    if (this.isUpdating) return;
    this.isUpdating = true;
    try {
      const sourceChart = this.charts.get(sourceId);
      if (!sourceChart || !this.hasValidViewBounds(sourceChart.getViewBounds())) return;

      const masterBounds = sourceChart.getViewBounds();

      for (const [chartId, chart] of this.charts.entries()) {
        if (chartId === sourceId) continue;

        const zoomOptions: { x?: Range; y?: Range; animate?: boolean } = { animate: false };

        if (this.options.axis === 'x' || this.options.axis === 'xy') {
          zoomOptions.x = [masterBounds.xMin, masterBounds.xMax];
        }

        if (this.options.axis === 'y' || this.options.axis === 'xy') {
          zoomOptions.y = [masterBounds.yMin, masterBounds.yMax];
        }

        if (zoomOptions.x || zoomOptions.y) {
          chart.zoom(zoomOptions);
        }
      }
    } finally {
      this.isUpdating = false;
    }
  }

  private scheduleSyncAction(key: string, action: () => void): void {
    if (this.options.debounce > 0) {
      this.debounceAction(key, action);
      return;
    }
    if (this.rafTimers.has(key)) return;
    const rafId = requestAnimationFrame(() => {
      this.rafTimers.delete(key);
      action();
    });
    this.rafTimers.set(key, rafId);
  }

  private debounceAction(key: string, action: () => void): void {
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) clearTimeout(existingTimer);
    const timerId = window.setTimeout(() => {
      this.debounceTimers.delete(key);
      action();
    }, this.options.debounce);
    this.debounceTimers.set(key, timerId);
  }
}

export function createChartGroup(charts: ChartLike[], options?: SyncOptions): ChartGroup {
  const group = new ChartGroup(options);
  group.addAll(...charts);
  return group;
}

export function linkCharts(chart1: ChartLike, chart2: ChartLike, options?: SyncOptions): ChartGroup {
  return createChartGroup([chart1, chart2], options);
}

export function createMasterSlave(
  master: ChartLike,
  slave: ChartLike,
  axis: SyncAxis = 'x',
): ChartGroup {
  return createChartGroup([master, slave], {
    axis,
    bidirectional: false,
    masterId: master.getId(),
    syncCursor: true,
    syncZoom: true,
    syncPan: true,
  });
}
