import "zone.js";
import "@angular/compiler";
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ElementRef } from "@angular/core";
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from "@angular/platform-browser-dynamic/testing";
import {
  VeloPlotComponent,
  StackedPlotComponent,
} from "./velo-plot.component";
import { buildMockChart } from "../bindings/test-utils";
import * as shared from "../bindings/shared";
import { createChartLifecycle } from "../bindings/shared/chartLifecycle";
import { createStackedChart } from "../core/stacked";
import { formatBindingDimension } from "../bindings/shared/dimensions";

const mockChart = buildMockChart();
const mockStack = {
  destroy: vi.fn(),
  fitAll: vi.fn(),
  resetAll: vi.fn(),
  getMaster: () => mockChart,
};

vi.mock("../bindings/shared/chartLifecycle", () => ({
  createChartLifecycle: vi.fn(() => ({
    chart: mockChart,
    getBounds: () => mockChart.getViewBounds(),
    destroy: mockChart.destroy,
  })),
}));

vi.mock("../core/stacked", () => ({
  createStackedChart: vi.fn(() => mockStack),
}));

describe("angular components", () => {
  beforeAll(() => {
    TestBed.initTestEnvironment(
      BrowserDynamicTestingModule,
      platformBrowserDynamicTesting(),
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(shared, "optionsChanged").mockReturnValue(true);
    vi.spyOn(shared, "syncChartOptions");
    vi.spyOn(shared, "diffSeries").mockReturnValue(new Map());
    TestBed.configureTestingModule({
      imports: [VeloPlotComponent, StackedPlotComponent],
    });
  });

  it("applySeries no-ops without chart", () => {
    const fixture = TestBed.createComponent(VeloPlotComponent);
    const comp = fixture.componentInstance;
    (comp as unknown as { applySeries: () => void }).applySeries();
    fixture.destroy();
  });

  it("formats numeric width and height via mount helpers", () => {
    const fixture = TestBed.createComponent(VeloPlotComponent);
    const comp = fixture.componentInstance;
    comp.mountChart(document.createElement("div"));
    expect(formatBindingDimension(640)).toBe("640px");
    expect(formatBindingDimension(320)).toBe("320px");
    fixture.destroy();
  });

  it("auto-mounts chart when container view is ready", () => {
    const fixture = TestBed.createComponent(VeloPlotComponent);
    const comp = fixture.componentInstance;
    const el = document.createElement("div");
    vi.spyOn(comp, "containerRef").mockReturnValue({ nativeElement: el } as ElementRef<HTMLDivElement>);
    comp.ngAfterViewInit();
    expect(createChartLifecycle).toHaveBeenCalled();
    fixture.destroy();
  });

  it("skips auto-mount when container ref is missing", () => {
    const fixture = TestBed.createComponent(VeloPlotComponent);
    const comp = fixture.componentInstance;
    vi.spyOn(comp, "containerRef").mockReturnValue(undefined as never);
    comp.ngAfterViewInit();
    expect(createChartLifecycle).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it("auto-mounts stacked chart when container view is ready", () => {
    const fixture = TestBed.createComponent(StackedPlotComponent);
    const comp = fixture.componentInstance;
    const el = document.createElement("div");
    vi.spyOn(comp, "containerRef").mockReturnValue({ nativeElement: el } as ElementRef<HTMLDivElement>);
    comp.ngAfterViewInit();
    expect(createStackedChart).toHaveBeenCalled();
    fixture.destroy();
  });

  it("skips stacked auto-mount when container ref is missing", () => {
    const fixture = TestBed.createComponent(StackedPlotComponent);
    const comp = fixture.componentInstance;
    vi.spyOn(comp, "containerRef").mockReturnValue(undefined as never);
    comp.ngAfterViewInit();
    expect(createStackedChart).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it("VeloPlotComponent applySeries invokes chart actions", () => {
    vi.mocked(shared.diffSeries).mockImplementation((actions) => {
      actions.addSeries({ id: "a" } as never);
      actions.updateSeries("a", {} as never);
      actions.removeSeries("a");
      actions.autoScale();
      return new Map();
    });
    const fixture = TestBed.createComponent(VeloPlotComponent);
    const comp = fixture.componentInstance;
    comp.mountChart(document.createElement("div"));
    fixture.detectChanges();
    expect(mockChart.addSeries).toHaveBeenCalled();
    expect(mockChart.updateSeries).toHaveBeenCalled();
    expect(mockChart.removeSeries).toHaveBeenCalled();
    expect(mockChart.autoScale).toHaveBeenCalled();
    fixture.destroy();
  });

  it("VeloPlotComponent syncOptionsAndSeries no-ops without chart", () => {
    const fixture = TestBed.createComponent(VeloPlotComponent);
    fixture.detectChanges();
    expect(shared.diffSeries).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it("VeloPlotComponent mounts, applies series, and destroys", async () => {
    const fixture = TestBed.createComponent(VeloPlotComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.mountChart(fixture.nativeElement.querySelector("div")!);
    expect(comp.getChart()).toBe(mockChart);
    expect(comp.widthStyle).toBe("100%");
    expect(comp.heightStyle).toBe("400px");
    expect(shared.diffSeries).toHaveBeenCalled();
    fixture.destroy();
    expect(mockChart.destroy).toHaveBeenCalled();
  });

  it("VeloPlotComponent syncs options on mount", () => {
    vi.mocked(shared.optionsChanged).mockReturnValue(true);
    const fixture = TestBed.createComponent(VeloPlotComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    comp.mountChart(fixture.nativeElement.querySelector("div")!);
    expect(shared.syncChartOptions).toHaveBeenCalled();
    fixture.destroy();
  });

  it("VeloPlotComponent skips remount and unchanged option sync", () => {
    vi.mocked(shared.optionsChanged).mockReturnValue(false);
    const fixture = TestBed.createComponent(VeloPlotComponent);
    const comp = fixture.componentInstance;
    const el = document.createElement("div");
    comp.mountChart(el);
    comp.mountChart(el);
    expect(createChartLifecycle).toHaveBeenCalledTimes(1);
    vi.mocked(shared.syncChartOptions).mockClear();
    fixture.componentRef.setInput("chartOptions", { theme: "dark" });
    fixture.detectChanges();
    expect(shared.syncChartOptions).not.toHaveBeenCalled();
    comp.resetZoom();
    expect(mockChart.resetZoom).toHaveBeenCalled();
    comp.ngOnDestroy();
  });

  it("VeloPlotComponent handles missing chart on resetZoom", () => {
    const fixture = TestBed.createComponent(VeloPlotComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    comp.resetZoom();
    expect(comp.getChart()).toBeNull();
    comp.ngOnDestroy();
  });

  it("StackedPlotComponent mounts and exposes helpers", async () => {
    const fixture = TestBed.createComponent(StackedPlotComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.mountStack(fixture.nativeElement.querySelector("div")!);
    expect(comp.stack).toBe(mockStack);
    expect(comp.widthStyle).toBe("100%");
    expect(comp.heightStyle).toBe("480px");
    comp.mountStack(document.createElement("div"));
    expect(mockStack.destroy).not.toHaveBeenCalled();
    comp.fitAll();
    comp.resetAll();
    expect(mockStack.fitAll).toHaveBeenCalled();
    comp.ngOnDestroy();
    expect(mockStack.destroy).toHaveBeenCalled();
  });

  it("StackedPlotComponent destroys cleanly without mount", () => {
    const fixture = TestBed.createComponent(StackedPlotComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    comp.fitAll();
    comp.resetAll();
    comp.ngOnDestroy();
    expect(comp.stack).toBeNull();
  });
});
