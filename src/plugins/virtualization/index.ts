/**
 * @fileoverview Data virtualization plugin (LOD/min-max)
 * @module plugins/virtualization
 */

import type {
  PluginVirtualizationConfig,
  VirtualizationAPI,
  VirtualizationStats,
  VirtualizationMode,
  VirtualizationStrategy,
} from "./types";
import type { ChartPlugin, PluginContext, PluginManifest } from "../types";
import type { Series } from "../../core/Series";
import type { SeriesUpdateData } from "../../types";
import {
  lttbDownsample,
  minMaxDownsample,
  ohlcMinMaxDownsample,
  calculateTargetPoints,
  sliceSeriesToViewport,
} from "../../workers/downsample";
import { downsampleAsync, ohlcDownsampleAsync } from "../../workers/downsampleAsync";

const manifest: PluginManifest = {
  name: "velo-plot-virtualization",
  version: "1.0.0",
  description: "Viewport-aware data virtualization with LOD strategies",
  provides: ["performance", "data-virtualization"],
  tags: ["performance", "lod", "virtualization"],
};

const DEFAULT_CONFIG: Required<PluginVirtualizationConfig> = {
  enabled: true,
  precision: "lod",
  mode: "lod",
  targetPoints: "auto",
  pointsPerPixel: 2,
  lodLevels: [1, 4, 8, 16],
  strategy: "lttb",
  reuseOriginalData: true,
  syncWithLazyLoad: true,
  includeSeries: [],
  excludeSeries: [],
  debug: false,
  viewportBuffer: 0.5,
  useWorker: true,
  workerThreshold: 250_000,
};

type SeriesCache = {
  x: Float32Array | Float64Array;
  y?: Float32Array | Float64Array;
  open?: Float32Array | Float64Array;
  high?: Float32Array | Float64Array;
  low?: Float32Array | Float64Array;
  close?: Float32Array | Float64Array;
};

export function PluginVirtualization(
  userConfig: Partial<PluginVirtualizationConfig> = {}
): ChartPlugin<PluginVirtualizationConfig> {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  let ctx: PluginContext | null = null;
  let isInternalUpdate = false;

  const originalData = new Map<string, SeriesCache>();
  const stats = new Map<string, VirtualizationStats>();

  let originalUpdateSeries: ((id: string, data: SeriesUpdateData) => void) | null = null;
  let originalAppendData: ((id: string, x: number[] | Float32Array, y: number[] | Float32Array) => void) | null = null;
  let refreshRaf = 0;
  const applyGeneration = new Map<string, number>();
  let lastViewKey = "";

  function log(message: string, ...args: unknown[]) {
    if (config.debug && ctx) {
      ctx.log.info(`[Virtualization] ${message}`, ...args);
    }
  }

  function shouldVirtualize(series: Series): boolean {
    if (!config.enabled) return false;
    if (config.precision === "full") return false;
    if (config.includeSeries.length > 0 && !config.includeSeries.includes(series.getId())) return false;
    if (config.excludeSeries.includes(series.getId())) return false;

    const type = series.getType();
    return (
      type === "line" ||
      type === "scatter" ||
      type === "line+scatter" ||
      type === "step" ||
      type === "step+scatter" ||
      type === "candlestick" ||
      type === "bar"
    );
  }

  function isOhlcSeries(series: Series): boolean {
    return series.getType() === "candlestick";
  }

  function buildUpdatePayload(cache: SeriesCache): SeriesUpdateData {
    if (cache.open && cache.high && cache.low && cache.close) {
      return {
        x: cache.x,
        open: cache.open,
        high: cache.high,
        low: cache.low,
        close: cache.close,
      };
    }
    return { x: cache.x, y: cache.y! };
  }

  function getTargetPoints(dataLength: number): number {
    if (!ctx) return dataLength;
    if (config.targetPoints !== "auto") return Math.max(2, config.targetPoints);
    const width = ctx.render.canvasSize.width / ctx.render.pixelRatio;
    return calculateTargetPoints(dataLength, width, config.pointsPerPixel);
  }

  function downsampleData(
    x: Float32Array | Float64Array,
    y: Float32Array | Float64Array,
    targetPoints: number,
    strategy: VirtualizationStrategy
  ): { x: Float32Array; y: Float32Array } {
    if (targetPoints >= x.length || x.length <= 2) {
      return { x: new Float32Array(x), y: new Float32Array(y) };
    }

    if (strategy === "minmax") {
      const bucketCount = Math.ceil(targetPoints / 2);
      const result = minMaxDownsample(x, y, bucketCount);
      return { x: result.x, y: result.y };
    }

    const result = lttbDownsample(x, y, targetPoints);
    return { x: result.x, y: result.y };
  }

  function cacheOriginal(seriesId: string, data: SeriesCache): void {
    if (!config.reuseOriginalData) return;
    if (originalData.has(seriesId)) return;
    originalData.set(seriesId, { ...data });
  }

  function restoreOriginal(seriesId: string): SeriesCache | null {
    return originalData.get(seriesId) ?? null;
  }

  function updateStats(
    seriesId: string,
    originalPoints: number,
    renderedPoints: number,
    targetPoints: number,
    mode: VirtualizationMode,
    strategy: VirtualizationStrategy,
  ): void {
    stats.set(seriesId, {
      seriesId,
      originalPoints,
      renderedPoints,
      targetPoints,
      lastUpdated: Date.now(),
      mode,
      strategy,
    });
  }

  function captureOriginalFromSeries(series: Series): SeriesCache | null {
    const live = series.getData();
    if (!live?.x?.length) return null;

    if (isOhlcSeries(series)) {
      if (!live.open || !live.high || !live.low || !live.close) return null;
      const cache: SeriesCache = {
        x: live.x,
        open: live.open,
        high: live.high,
        low: live.low,
        close: live.close,
      };
      cacheOriginal(series.getId(), cache);
      return cache;
    }

    if (!live.y) return null;
    const cache: SeriesCache = { x: live.x, y: live.y };
    cacheOriginal(series.getId(), cache);
    return cache;
  }

  function getSourceData(series: Series): SeriesCache | null {
    return restoreOriginal(series.getId()) ?? captureOriginalFromSeries(series);
  }

  function getViewportSource(source: SeriesCache): SeriesCache {
    if (!ctx) return source;
    const bounds = ctx.data.getViewBounds?.();
    if (!bounds) return source;

    const sliced = sliceSeriesToViewport(
      source,
      bounds.xMin,
      bounds.xMax,
      config.viewportBuffer,
    );
    if (sliced.end - sliced.start >= source.x.length) return source;

    return {
      x: sliced.x,
      y: sliced.y,
      open: sliced.open,
      high: sliced.high,
      low: sliced.low,
      close: sliced.close,
    };
  }

  function commitDownsampled(seriesId: string, payload: SeriesUpdateData): void {
    if (!originalUpdateSeries) return;
    isInternalUpdate = true;
    originalUpdateSeries(seriesId, payload);
    isInternalUpdate = false;
  }

  async function runDownsample(
    source: SeriesCache,
    targetPoints: number,
    strategy: VirtualizationStrategy,
  ): Promise<{ x: Float32Array; y: Float32Array }> {
    const x = new Float32Array(source.x);
    const y = new Float32Array(source.y!);

    if (config.useWorker && x.length >= config.workerThreshold) {
      const algorithm = strategy === "minmax" ? "minmax" : "lttb";
      const result = await downsampleAsync(x, y, targetPoints, algorithm);
      return { x: result.x, y: result.y };
    }

    return downsampleData(x, y, targetPoints, strategy);
  }

  async function applyVirtualization(series: Series): Promise<void> {
    if (!ctx || !originalUpdateSeries) return;
    const seriesId = series.getId();

    if (!shouldVirtualize(series)) {
      const original = restoreOriginal(seriesId);
      if (original && config.reuseOriginalData) {
        commitDownsampled(seriesId, buildUpdatePayload(original));
      }
      return;
    }

    const source = getSourceData(series);
    if (!source?.x?.length) return;

    const viewportSource = getViewportSource(source);
    const gen = (applyGeneration.get(seriesId) ?? 0) + 1;
    applyGeneration.set(seriesId, gen);

    if (isOhlcSeries(series)) {
      if (!viewportSource.open || !viewportSource.high || !viewportSource.low || !viewportSource.close) {
        return;
      }

      const targetBars = getTargetPoints(viewportSource.x.length);
      const x = new Float32Array(viewportSource.x);
      const open = new Float32Array(viewportSource.open);
      const high = new Float32Array(viewportSource.high);
      const low = new Float32Array(viewportSource.low);
      const close = new Float32Array(viewportSource.close);

      const downsampled =
        config.useWorker && x.length >= config.workerThreshold
          ? await ohlcDownsampleAsync(x, open, high, low, close, targetBars)
          : ohlcMinMaxDownsample(x, open, high, low, close, targetBars);

      if (applyGeneration.get(seriesId) !== gen) return;

      commitDownsampled(seriesId, {
        x: downsampled.x,
        open: downsampled.open,
        high: downsampled.high,
        low: downsampled.low,
        close: downsampled.close,
      });

      updateStats(seriesId, source.x.length, downsampled.x.length, targetBars, config.mode, "minmax");
      return;
    }

    if (!viewportSource.y) return;

    const targetPoints = getTargetPoints(viewportSource.x.length);
    const strategy = series.getType() === "bar" ? "minmax" : config.strategy;
    const downsampled = await runDownsample(viewportSource, targetPoints, strategy);

    if (applyGeneration.get(seriesId) !== gen) return;

    commitDownsampled(seriesId, { x: downsampled.x, y: downsampled.y });
    updateStats(seriesId, source.x.length, downsampled.x.length, targetPoints, config.mode, strategy);
  }

  function refreshAll(): void {
    if (!ctx) return;
    ctx.data.getAllSeries().forEach((series) => {
      void applyVirtualization(series);
    });
  }

  function scheduleRefreshAll(): void {
    if (!ctx) return;
    const bounds = ctx.data.getViewBounds?.();
    if (bounds) {
      const key = `${bounds.xMin}:${bounds.xMax}:${bounds.yMin}:${bounds.yMax}:${ctx.render.canvasSize.width}`;
      if (key === lastViewKey) return;
      lastViewKey = key;
    }

    if (refreshRaf) return;
    refreshRaf = requestAnimationFrame(() => {
      refreshRaf = 0;
      refreshAll();
    });
  }

  function handleUpdateSeries(id: string, data: SeriesUpdateData): void {
    if (!ctx || !originalUpdateSeries) return;
    if (!config.enabled || isInternalUpdate) {
      originalUpdateSeries(id, data);
      return;
    }

    const series = ctx.chart.getSeries?.(id) as Series | undefined;
    if (!series) {
      originalUpdateSeries(id, data);
      return;
    }

    const original = restoreOriginal(id);
    if (original && config.reuseOriginalData) {
      isInternalUpdate = true;
      originalUpdateSeries(id, buildUpdatePayload(original));
      isInternalUpdate = false;
    }

    originalUpdateSeries(id, data);

    const updatedSeries = ctx.chart.getSeries?.(id) as Series | undefined;
    if (updatedSeries) {
      originalData.delete(id);
      captureOriginalFromSeries(updatedSeries);
      void applyVirtualization(updatedSeries);
    }
  }

  function handleAppendData(
    id: string,
    x: number[] | Float32Array,
    y: number[] | Float32Array
  ): void {
    if (!ctx || !originalAppendData || !originalUpdateSeries) return;

    if (!config.enabled || isInternalUpdate) {
      originalAppendData(id, x, y);
      return;
    }

    const series = ctx.chart.getSeries?.(id) as Series | undefined;
    if (!series) {
      originalAppendData(id, x, y);
      return;
    }

    const original = restoreOriginal(id);
    if (original && config.reuseOriginalData) {
      isInternalUpdate = true;
      originalUpdateSeries(id, buildUpdatePayload(original));
      isInternalUpdate = false;
    }

    originalAppendData(id, x, y);

    const updatedSeries = ctx.chart.getSeries?.(id) as Series | undefined;
    if (updatedSeries) {
      const cached = restoreOriginal(id);
      if (cached?.y && config.reuseOriginalData) {
        cacheOriginal(id, {
          x: appendTyped(cached.x, x),
          y: appendTyped(cached.y, y),
        });
      } else {
        originalData.delete(id);
        captureOriginalFromSeries(updatedSeries);
      }
      void applyVirtualization(updatedSeries);
    }
  }

  function appendTyped(
    existing: Float32Array | Float64Array,
    incoming: number[] | Float32Array,
  ): Float32Array {
    const next = incoming instanceof Float32Array ? incoming : Float32Array.from(incoming);
    const merged = new Float32Array(existing.length + next.length);
    merged.set(existing);
    merged.set(next, existing.length);
    return merged;
  }

  const api: VirtualizationAPI & Record<string, unknown> = {
    enable() {
      config.enabled = true;
      refreshAll();
    },
    disable() {
      config.enabled = false;
      if (!ctx || !originalUpdateSeries) return;
      const updater = originalUpdateSeries;
      ctx.data.getAllSeries().forEach((series) => {
        const original = restoreOriginal(series.getId());
        if (original) {
          isInternalUpdate = true;
          updater(series.getId(), buildUpdatePayload(original));
          isInternalUpdate = false;
        }
      });
    },
    isEnabled() {
      return config.enabled;
    },
    updateConfig(newConfig) {
      Object.assign(config, newConfig);
      refreshAll();
    },
    invalidate(seriesId) {
      if (!ctx) return;
      if (seriesId) {
        const series = ctx.chart.getSeries?.(seriesId) as Series | undefined;
        if (series) applyVirtualization(series);
        return;
      }
      refreshAll();
    },
    getStats(seriesId) {
      return stats.get(seriesId) ?? null;
    },
    getAllStats() {
      return Array.from(stats.values());
    },
  };

  return {
    manifest,
    onInit(pluginCtx: PluginContext) {
      ctx = pluginCtx;
      // API is exposed via plugin.api / chart.virtualization getter (ChartPluginBridge)

      const chart = ctx.chart as any;
      originalUpdateSeries = chart.updateSeries?.bind(chart) ?? null;
      originalAppendData = chart.appendData?.bind(chart) ?? null;

      if (originalUpdateSeries) {
        chart.updateSeries = (id: string, data: SeriesUpdateData) => handleUpdateSeries(id, data);
      }

      if (originalAppendData) {
        chart.appendData = (id: string, x: number[] | Float32Array, y: number[] | Float32Array) =>
          handleAppendData(id, x, y);
      }

      ctx.events.on("zoom", () => scheduleRefreshAll());
      ctx.events.on("pan", () => scheduleRefreshAll());
      ctx.events.on("resize", () => {
        lastViewKey = "";
        scheduleRefreshAll();
      });

      refreshAll();
      log("Initialized");
    },
    onDestroy(pluginCtx: PluginContext) {
      if (refreshRaf) cancelAnimationFrame(refreshRaf);
      refreshRaf = 0;
      applyGeneration.clear();
      if (originalUpdateSeries) {
        (pluginCtx.chart as any).updateSeries = originalUpdateSeries;
      }
      if (originalAppendData) {
        (pluginCtx.chart as any).appendData = originalAppendData;
      }
      ctx = null;
      originalData.clear();
      stats.clear();
    },
    api,
  };
}

export default PluginVirtualization;

// Type exports
export type {
  PluginVirtualizationConfig,
  VirtualizationAPI,
  VirtualizationStats,
  VirtualizationMode,
  VirtualizationStrategy,
} from "./types";
