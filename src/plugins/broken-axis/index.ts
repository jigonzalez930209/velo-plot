/**
 * @fileoverview Broken Axis plugin for displaying discontinuous data ranges.
 * @module plugins/broken-axis
 */

import type {
  PluginBrokenAxisConfig,
  BrokenAxisAPI,
  AxisBreak,
} from './types';
import type {
  ChartPlugin,
  PluginContext,
  PluginManifest,
} from '../types';
import { BrokenAxisScale } from './BrokenAxisScale';

const manifest: PluginManifest = {
  name: 'velo-plot-broken-axis',
  version: '1.0.1',
  description: 'Support for gaps/breaks in axes with visual indicators',
  provides: ['broken-axis', 'coordinate-transform'],
  tags: ['axis', 'layout', 'visualization'],
};

export function PluginBrokenAxis(
  config: PluginBrokenAxisConfig = { axes: {} }
): ChartPlugin<PluginBrokenAxisConfig> {
  // Default enabled to true if not specified
  if (config.enabled === undefined) config.enabled = true;
  
  let ctx: PluginContext | null = null;
  let originalXScale: any = null;
  let brokenXScale: BrokenAxisScale | null = null;

  // Storage for raw (un-warped) data of series to allow re-transformation.
  const rawDataStore = new Map<string, { x: Float32Array; y: Float32Array }>();

  /** Union X-extent across all stored series — the domain breaks live in. */
  function computeWarpDomain(): [number, number] | null {
    let min = Infinity;
    let max = -Infinity;
    for (const raw of rawDataStore.values()) {
      for (let i = 0; i < raw.x.length; i++) {
        const v = raw.x[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return null;
    return [min, max];
  }

  function updateScales() {
    if (!ctx || !config.enabled) return;

    const options = config.axes.default || config.axes.xAxis;
    if (options && brokenXScale) {
        brokenXScale.updateBreaks(options.breaks);
        // On break change, we must re-transform everything
        applyTransformations({ syncView: true });
    }
  }

  /**
   * Re-warp every stored series into compressed (broken) space using the
   * data-derived warp domain, then align the chart's X view to that domain so
   * the axis ticks and break symbols (which the render pass computes from
   * viewBounds) line up with the warped data.
   */
  function applyTransformations(opts: { syncView?: boolean } = {}) {
      if (!ctx || !brokenXScale || !config.enabled) return;
      const chart = ctx.chart as any;

      const domain = computeWarpDomain();
      if (!domain) return;
      const [min, max] = domain;
      const range = max - min || 1;

      // Pin the scale to the warp domain so mapToRatio uses the correct segments,
      // independent of whatever sub-range the last render/zoom left behind.
      brokenXScale.setDomain(min, max);

      for (const [id, raw] of rawDataStore.entries()) {
          const transformedX = new Float32Array(raw.x.length);
          for (let i = 0; i < raw.x.length; i++) {
              transformedX[i] = min + brokenXScale.mapToRatio(raw.x[i]) * range;
          }
          // Call the TRUE underlying updateSeries to avoid the hijacking loop.
          if (chart._originalUpdateSeries) {
              chart._originalUpdateSeries(id, { x: transformedX, y: raw.y });
          }
      }

      if (opts.syncView && typeof chart.zoom === 'function') {
          // Constrain X to the warped data domain (warped values also span
          // [min,max]). Y is left untouched so the caller's Y range is preserved.
          chart.zoom({ x: [min, max], animate: false });
      }
  }

  function drawBreakSymbols(pCtx: PluginContext) {
    const { render } = pCtx;
    const { ctx2d, plotArea } = render;
    if (!ctx2d || !brokenXScale) return;

    for (const [axisId, options] of Object.entries(config.axes)) {
        const orientation = (axisId === 'default' || axisId === 'xAxis') ? 'horizontal' : 'vertical';
        if (orientation !== 'horizontal') continue;

        options.breaks.forEach(b => {
             const pxStart = brokenXScale!.transform(b.start);
             const pxEnd = brokenXScale!.transform(b.end);
             const midPx = (pxStart + pxEnd) / 2;
             // Per-break symbol takes precedence, then the axis default.
             const symbol = b.symbol || options.defaultSymbol || 'diagonal';

             ctx2d.save();
             ctx2d.lineWidth = 1.5;
             ctx2d.strokeStyle = options.symbolColor || '#ff00ff';

             if (orientation === 'horizontal') {
                drawSymbol(ctx2d, midPx, plotArea.y, symbol, 'top');
                drawSymbol(ctx2d, midPx, plotArea.y + plotArea.height, symbol, 'bottom');
             }
             ctx2d.restore();
        });
    }
  }

  function drawSymbol(ctx: CanvasRenderingContext2D, x: number, y: number, type: string, edge: string) {
      const size = 6;
      ctx.beginPath();
      if (type === 'diagonal') {
          ctx.moveTo(x - size, y + size/2);
          ctx.lineTo(x + size, y - size/2);
          ctx.moveTo(x - size + 3, y + size/2);
          ctx.lineTo(x + size + 3, y - size/2);
      } else if (type === 'zigzag') {
          ctx.moveTo(x - size, y);
          ctx.lineTo(x - size/2, y - size/2);
          ctx.lineTo(x + size/2, y + size/2);
          ctx.lineTo(x + size, y);
      } else {
          if (edge === 'top' || edge === 'bottom') {
              ctx.moveTo(x - size, y - 2); ctx.lineTo(x + size, y + 2);
              ctx.moveTo(x - size, y - 6); ctx.lineTo(x + size, y - 2);
          } else {
              ctx.moveTo(x - 2, y - size); ctx.lineTo(x + 2, y + size);
          }
      }
      ctx.stroke();
  }

  const api: BrokenAxisAPI = {
      addBreak(axisId, b) {
          if (!config.axes[axisId]) config.axes[axisId] = { breaks: [] };
          config.axes[axisId].breaks.push(b);
          updateScales();
          ctx?.requestRender();
      },
      clearBreaks(axisId) {
          if (config.axes[axisId]) config.axes[axisId].breaks = [];
          updateScales();
          ctx?.requestRender();
      },
      setEnabled(enabled: boolean) {
          const wasEnabled = config.enabled;
          config.enabled = enabled;
          
          if (ctx && wasEnabled !== enabled) {
              const chart = ctx.chart;
              if (enabled) {
                  originalXScale = (chart as any).xScale;
                  brokenXScale = new BrokenAxisScale(originalXScale, (config.axes.default || config.axes.xAxis)?.breaks || []);
                  chart.setXScale(brokenXScale);
                  applyTransformations({ syncView: true });
              } else {
                  if (originalXScale) {
                      chart.setXScale(originalXScale);
                      brokenXScale = null;
                      // Restore original data to series
                      for (const [id, raw] of rawDataStore.entries()) {
                          (chart as any)._originalUpdateSeries(id, raw);
                      }
                  }
              }
          }
          ctx?.requestRender();
      },
      getBreaks(axisId: string): AxisBreak[] {
          return config.axes[axisId]?.breaks || [];
      },
      updateConfig(newConfig: Partial<PluginBrokenAxisConfig>) {
          Object.assign(config, newConfig);
          updateScales();
          ctx?.requestRender();
      }
  };

  const pluginApi: BrokenAxisAPI & Record<string, unknown> = api as any;

  return {
    manifest,
    onInit(pCtx) {
      ctx = pCtx;
      const chart = ctx.chart as any;
      // NOTE: `chart.brokenAxis` is a read-only getter on ChartCore that resolves
      // this plugin's `api` via the plugin bridge — do NOT assign to it (that
      // throws "Cannot set property ... which has only a getter" and aborts
      // plugin registration entirely).

      // Hijack and Save original methods
      chart._originalUpdateSeries = chart.updateSeries.bind(chart);
      chart._originalAddSeries = chart.addSeries.bind(chart);
      chart._originalAppendData = chart.appendData.bind(chart);

      const toF32 = (v: any): Float32Array =>
          v instanceof Float32Array ? v : new Float32Array(typeof v === 'number' ? [v] : v);

      chart.updateSeries = (id: string, data: any) => {
          if (data.x && data.y) {
              rawDataStore.set(id, { x: toF32(data.x), y: toF32(data.y) });
          }

          if (config.enabled && brokenXScale && data.x) {
              // Re-warp all series against the (possibly grown) data domain.
              applyTransformations({ syncView: true });
          } else {
              chart._originalUpdateSeries(id, data);
          }
      };

      chart.addSeries = (options: any) => {
          if (options.id && options.data?.x && options.data?.y) {
              rawDataStore.set(options.id, { x: toF32(options.data.x), y: toF32(options.data.y) });
          }

          if (config.enabled && brokenXScale && options.data?.x) {
              // Add the series (untransformed) so the chart registers it, then
              // warp every series consistently against the data-derived domain.
              chart._originalAddSeries(options);
              applyTransformations({ syncView: true });
          } else {
              chart._originalAddSeries(options);
          }
      };

      chart.appendData = (id: string, x: any, y: any) => {
          const raw = rawDataStore.get(id);
          if (raw) {
              const newX = toF32(x);
              const newY = toF32(y);
              const combinedX = new Float32Array(raw.x.length + newX.length);
              const combinedY = new Float32Array(raw.y.length + newY.length);
              combinedX.set(raw.x);
              combinedX.set(newX, raw.x.length);
              combinedY.set(raw.y);
              combinedY.set(newY, raw.y.length);
              rawDataStore.set(id, { x: combinedX, y: combinedY });
          }

          if (config.enabled && brokenXScale) {
              applyTransformations({ syncView: true });
          } else {
              chart._originalAppendData(id, x, y);
          }
      };

      if (config.enabled) {
          originalXScale = chart.xScale; 
          const options = config.axes.default || config.axes.xAxis;
          brokenXScale = new BrokenAxisScale(originalXScale, options?.breaks || []);
          chart.setXScale(brokenXScale);
      }
    },
    onDestroy() {
        if (ctx) {
            const chart = (ctx.chart as any);
            if (originalXScale) {
                chart.setXScale(originalXScale);
            }
            // CLEANUP hijacked methods
            chart.updateSeries = chart._originalUpdateSeries;
            chart.addSeries = chart._originalAddSeries;
            chart.appendData = chart._originalAppendData;
            delete chart._originalUpdateSeries;
            delete chart._originalAddSeries;
            delete chart._originalAppendData;
        }
        ctx = null;
        rawDataStore.clear();
    },
    onRenderOverlay(pCtx) {
        if (config.enabled) drawBreakSymbols(pCtx);
    },
    onViewChange() {
        // Data is warped once against the fixed data-domain; a user zoom/pan is
        // just a linear view over the already-warped buffers, so we must NOT
        // re-warp here (doing so against the transient view domain is exactly
        // what collapsed the chart before). Nothing to do.
    },
    api: pluginApi
  };
}

export default PluginBrokenAxis;

export type {
  PluginBrokenAxisConfig,
  BrokenAxisAPI,
  AxisBreak,
  BrokenAxisOptions,
} from './types';
