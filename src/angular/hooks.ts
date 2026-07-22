/**
 * Angular service-style hooks (usable in components).
 */

import { Injectable, OnDestroy } from "@angular/core";
import type { Chart } from "../core/Chart";
import type { StackedChart, StackedChartOptions } from "../core/stacked";
import type { ChartLike, SyncOptions } from "../core/sync";
import { ChartGroup } from "../core/sync";
import {
  createChartLifecycle,
  createChartSync,
  createRegisteredStackedChart,
  addIndicatorToHost,
  type ChartBindingOptions,
  type IndicatorHost,
} from "../bindings/shared";
import type { AddIndicatorOptions, AddIndicatorResult } from "../core/indicator/addIndicator";
import type { IndicatorPresetName } from "../core/indicator/indicatorPresets";

@Injectable()
export class VeloPlotHost implements OnDestroy {
  chart: Chart | null = null;
  private destroy: (() => void) | null = null;

  mount(container: HTMLDivElement, options: ChartBindingOptions = {}): void {
    this.destroy?.();
    const handle = createChartLifecycle(container, options);
    this.chart = handle.chart;
    this.destroy = handle.destroy;
  }

  ngOnDestroy(): void {
    this.destroy?.();
    this.chart = null;
  }
}

export function useVeloPlotAngular() {
  return new VeloPlotHost();
}

export function useStackedPlotAngular(
  container: HTMLDivElement,
  options: Omit<StackedChartOptions, "container">,
): { stack: StackedChart; destroy: () => void } {
  const stack = createRegisteredStackedChart({ ...options, container });
  return { stack, destroy: () => stack.destroy() };
}

export async function useIndicatorAngular(
  host: IndicatorHost,
  preset: IndicatorPresetName,
  options?: AddIndicatorOptions,
): Promise<AddIndicatorResult & { paneId?: string }> {
  return addIndicatorToHost(host, preset, options ?? {});
}

export function useChartSyncAngular(
  charts: ChartLike[],
  options?: SyncOptions,
): { group: ChartGroup | null; destroy: () => void } {
  if (charts.length < 2) return { group: null, destroy: () => {} };
  const handle = createChartSync(charts, options);
  return { group: handle.group, destroy: handle.destroy };
}
