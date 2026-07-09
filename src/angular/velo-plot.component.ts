import {
  Component,
  input,
  output,
  viewChild,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  effect,
} from "@angular/core";
import { createStackedChart } from "../core/stacked";
import type { StackedChart, StackedPaneConfig, StackedChartOptions } from "../core/stacked";
import type { Chart } from "../core/Chart";
import type { Bounds, CursorOptions } from "../types";
import {
  createChartLifecycle,
  diffSeries,
  type VeloPlotSeries,
  type ChartBindingOptions,
  pickSyncableOptions,
  optionsChanged,
  syncChartOptions,
} from "../bindings/shared";
import { formatBindingDimension } from "../bindings/shared/dimensions";

@Component({
  selector: "velo-plot",
  standalone: true,
  template: `<div #container class="velo-plot-container" role="img" [style.width]="widthStyle" [style.height]="heightStyle"></div>`,
  styles: [`:host { display: block; } .velo-plot-container { position: relative; }`],
})
export class VeloPlotComponent implements OnDestroy, AfterViewInit {
  readonly series = input<VeloPlotSeries[]>([]);
  readonly width = input<number | string>("100%");
  readonly height = input<number | string>(400);
  readonly cursor = input<CursorOptions | undefined>();
  readonly chartOptions = input<ChartBindingOptions>({});
  readonly zoomChange = output<Bounds>();

  readonly containerRef = viewChild<ElementRef<HTMLDivElement>>("container", {
    read: ElementRef,
  });

  chart: Chart | null = null;
  private destroy: (() => void) | null = null;
  private previousSeries = new Map<string, VeloPlotSeries>();
  private prevSync = pickSyncableOptions({});

  constructor() {
    effect(() => {
      this.containerRef();
      this.syncOptionsAndSeries();
    });
  }

  ngAfterViewInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (el) this.mountChart(el);
  }

  mountChart(container: HTMLDivElement): void {
    if (this.chart) return;
    const handle = createChartLifecycle(container, this.chartOptions());
    this.chart = handle.chart;
    this.destroy = handle.destroy;
    this.prevSync = pickSyncableOptions(this.chartOptions());
    this.syncOptionsAndSeries();
  }

  get widthStyle(): string {
    return formatBindingDimension(this.width());
  }

  get heightStyle(): string {
    return formatBindingDimension(this.height());
  }

  ngOnDestroy(): void {
    this.destroy?.();
    this.chart = null;
  }

  private syncOptionsAndSeries(): void {
    if (!this.chart) return;
    const next = pickSyncableOptions(this.chartOptions());
    if (optionsChanged(this.prevSync, next)) {
      syncChartOptions(this.chart, this.prevSync, next);
      this.prevSync = next;
    }
    this.applySeries();
  }

  private applySeries(): void {
    if (!this.chart) return;
    this.previousSeries = diffSeries(
      {
        addSeries: (o) => this.chart!.addSeries(o),
        updateSeries: (id, d) => this.chart!.updateSeries(id, d),
        removeSeries: (id) => this.chart!.removeSeries(id),
        autoScale: () => this.chart!.autoScale(),
      },
      this.series(),
      this.previousSeries,
    );
  }

  resetZoom(): void {
    this.chart?.resetZoom();
  }

  getChart(): Chart | null {
    return this.chart;
  }
}

@Component({
  selector: "velo-stacked-plot",
  standalone: true,
  template: `<div #container class="velo-plot-stacked" role="img" [style.width]="widthStyle" [style.height]="heightStyle"></div>`,
  styles: [`:host { display: block; } .velo-plot-stacked { position: relative; }`],
})
export class StackedPlotComponent implements OnDestroy, AfterViewInit {
  readonly panes = input<StackedPaneConfig[]>([]);
  readonly width = input<number | string>("100%");
  readonly height = input<number | string>(480);
  readonly stackOptions = input<Omit<StackedChartOptions, "container" | "panes">>({});

  readonly containerRef = viewChild<ElementRef<HTMLDivElement>>("container", {
    read: ElementRef,
  });

  stack: StackedChart | null = null;
  private destroy: (() => void) | null = null;

  get widthStyle(): string {
    return formatBindingDimension(this.width());
  }

  get heightStyle(): string {
    return formatBindingDimension(this.height());
  }

  ngAfterViewInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (el) this.mountStack(el);
  }

  mountStack(container: HTMLDivElement): void {
    if (this.stack) return;
    const created = createStackedChart({
      ...this.stackOptions(),
      panes: this.panes(),
      container,
    });
    this.stack = created;
    this.destroy = () => created.destroy();
  }

  ngOnDestroy(): void {
    this.destroy?.();
    this.stack = null;
  }

  fitAll(): void {
    this.stack?.fitAll();
  }

  resetAll(): void {
    this.stack?.resetAll();
  }
}

export { useVeloPlotAngular, useStackedPlotAngular, useIndicatorAngular, useChartSyncAngular } from "./hooks";
