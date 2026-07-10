/**
 * Trading-specific series preprocessors and chart method extensions.
 */
import type { SeriesOptions } from "../types";
import { computeHeikinAshi } from "../core/chart/heikinAshi";
import {
  applyBusinessDayX,
  isBusinessDayScaleActive,
} from "../core/time/applyTimeScale";
import { buildIndicatorSeries } from "../core/indicator/buildIndicatorSeries";
import type { IndicatorSeriesOptions } from "../core/indicator/types";
import {
  registerSeriesOptionsExpander,
  registerSeriesOptionsPreprocessor,
} from "../core/chart/series/seriesOptionsRegistry";
import { registerSeriesDataPreprocessor } from "../core/chart/series/SeriesActions";
import { registerExtendedSeries } from "../renderer/registerExtendedSeries";
import { patchExportSVG } from "../core/chart/chartExportPatch";
import { ChartImpl } from "../core/chart/ChartCore";
import {
  addIndicatorToChart,
  type AddIndicatorOptions,
  type AddIndicatorResult,
  type IndicatorPresetName,
} from "../core/indicator/addIndicator";
import {
  ChartAlertManager,
  type PriceAlertOptions,
} from "../core/chart/ChartAlerts";
import {
  buildPositionLineAnnotation,
  type PositionLineOptions,
} from "../core/chart/positionLines";
import type { DrawingMode } from "../plugins/drawing-tools";

let registered = false;

function registerTradingSeriesPreprocessors(): void {
  registerSeriesOptionsPreprocessor((ctx: any, options) => {
    if (options.type === "heatmap" || options.type === "indicator") {
      return options;
    }

    let opts = { ...options } as SeriesOptions;

    if ((opts.type as string) === "heikin-ashi") {
      const d = opts.data;
      if (d?.open && d.high && d.low && d.close) {
        const ha = computeHeikinAshi({
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        });
        opts = {
          ...opts,
          type: "candlestick",
          data: { ...d, ...ha },
        };
      }
    }

    if (isBusinessDayScaleActive(ctx.xAxisOptions) && opts.data?.x?.length) {
      const { displayX, mapping } = applyBusinessDayX(
        opts.data.x,
        ctx.xAxisOptions,
      );
      ctx.setTimeScaleMapping(mapping);
      opts = {
        ...opts,
        data: { ...opts.data, x: displayX },
      };
    }

    return opts;
  });

  registerSeriesOptionsExpander((options) => {
    if ((options as SeriesOptions).type === "indicator") {
      return buildIndicatorSeries(options as IndicatorSeriesOptions);
    }
    return [options];
  });

  registerSeriesDataPreprocessor((ctx: any, data: import("../types").SeriesUpdateData) => {
    if (data.x && isBusinessDayScaleActive(ctx.xAxisOptions)) {
      const { displayX, mapping } = applyBusinessDayX(data.x, ctx.xAxisOptions);
      ctx.setTimeScaleMapping(mapping);
      return { ...data, x: displayX };
    }
    return data;
  });
}

export function patchChartTradingMethods(): void {
  const proto = ChartImpl.prototype as any;

  if (proto._tradingPatched) return;
  proto._tradingPatched = true;

  proto.addIndicator = async function (
    this: ChartImpl,
    preset: IndicatorPresetName,
    options?: AddIndicatorOptions,
  ): Promise<AddIndicatorResult> {
    return addIndicatorToChart(this, preset, options);
  };

  proto.addAlert = function (
    this: ChartImpl,
    options: PriceAlertOptions,
  ): string {
    return getAlertManager(this).addAlert(options);
  };

  proto.removeAlert = function (this: ChartImpl, id: string): boolean {
    return getAlertManager(this).removeAlert(id);
  };

  proto.clearAlerts = function (this: ChartImpl): void {
    getAlertManager(this).clearAlerts();
  };

  proto.getAlerts = function (this: ChartImpl): PriceAlertOptions[] {
    return getAlertManager(this).getAlerts();
  };

  proto.addPositionLine = function (
    this: ChartImpl,
    options: PositionLineOptions,
  ): string {
    const self = this as ChartImpl & { _positionLineCounter?: number };
    if (self._positionLineCounter === undefined) self._positionLineCounter = 0;
    const id = options.id ?? `position-${++self._positionLineCounter}`;
    self.addAnnotation(buildPositionLineAnnotation(options, id));
    return id;
  };

  proto.setDrawingMode = function (this: ChartImpl, mode: DrawingMode): void {
    const plugin = this.getPlugin<{ setMode?: (m: DrawingMode) => void }>(
      "velo-plot-drawing-tools",
    );
    plugin?.setMode?.(mode);
  };

  const originalDestroy = proto.destroy;
  proto.destroy = function (this: ChartImpl) {
    const self = this as any;
    self._alertManager?.destroy();
    self._alertManager = undefined;
    self.setFeatureHooks(null);
    return originalDestroy.call(this);
  };
}

function getAlertManager(chart: ChartImpl): ChartAlertManager {
  const self = chart as any;
  if (!self._alertManager) {
    self._alertManager = new ChartAlertManager(chart.events, (seriesId) => {
      const s = seriesId ? chart.series.get(seriesId) : undefined;
      if (s) return s as import("../core/chart/ChartAlerts").AlertableSeries;
      const first = chart.series.values().next().value;
      return first as import("../core/chart/ChartAlerts").AlertableSeries | undefined;
    });
    chart.setFeatureHooks({
      onDataUpdate: () => self._alertManager?.evaluate(),
      getAlerts: () => self._alertManager?.getAlerts() ?? [],
      destroy: () => self._alertManager?.destroy(),
    });
  }
  return self._alertManager;
}

/** Register trading extensions (call on `velo-plot/trading` import). */
export function registerTradingBundle(): void {
  if (registered) return;
  registered = true;
  registerExtendedSeries();
  registerTradingSeriesPreprocessors();
  patchChartTradingMethods();
  patchExportSVG();
}

// Auto-register when trading entry is imported
registerTradingBundle();
