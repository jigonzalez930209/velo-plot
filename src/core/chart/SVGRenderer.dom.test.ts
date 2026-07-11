/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createChart } from "../Chart";
import { patchExportSVG } from "./chartExportPatch";
import { PluginRadar } from "../../plugins/radar";
import { registerExtendedSeriesBuffers } from "../../renderer/seriesBufferExtended";

function mock2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  let transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const noop = vi.fn();
  return {
    canvas,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    globalAlpha: 1,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    save: noop,
    restore: noop,
    setLineDash: noop,
    translate: noop,
    rotate: noop,
    clip: noop,
    rect: noop,
    arc: noop,
    arcTo: noop,
    closePath: noop,
    drawImage: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    fill: noop,
    measureText: vi.fn(() => ({ width: 10 })),
    fillText: noop,
    setTransform: vi.fn((a: number, b: number, c: number, d: number, e: number, f: number) => {
      transform = { a, b, c, d, e, f };
    }),
    getTransform: () => transform,
    scale: noop,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high" as ImageSmoothingQuality,
  } as unknown as CanvasRenderingContext2D;
}

describe("SVG live renderer", () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(function (
      this: HTMLCanvasElement,
      type: string,
    ) {
      if (type === "2d") return mock2dContext(this);
      if (type === "webgl2" || type === "webgl") {
        return {} as WebGL2RenderingContext;
      }
      return null;
    }) as typeof HTMLCanvasElement.prototype.getContext;

    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    patchExportSVG();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates chart with renderer svg and renders vector layer", async () => {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    container.getBoundingClientRect = () =>
      ({
        width: 400,
        height: 300,
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(container);

    const chart = createChart({
      container,
      width: 400,
      height: 300,
      renderer: "svg",
      animations: false,
      showLegend: false,
    });

    chart.addSeries({
      id: "line",
      type: "line",
      data: {
        x: Float32Array.from([0, 50, 100]),
        y: Float32Array.from([10, 30, 20]),
      },
      style: { color: "#ff0055", width: 2 },
    });

    await vi.waitFor(
      () => chart.getActiveRenderer() === "svg" && container.querySelector("svg.velo-plot-svg-layer") != null,
      { timeout: 3000 },
    );

    chart.render();

    const svgLayer = container.querySelector("svg.velo-plot-svg-layer");
    await vi.waitFor(() => (svgLayer?.innerHTML.length ?? 0) > 0, { timeout: 3000 });

    expect(chart.getActiveRenderer()).toBe("svg");
    expect(svgLayer).toBeTruthy();
    expect(svgLayer!.innerHTML).toContain("polyline");

    chart.destroy();
    container.remove();
  });

  it("adds a heatmap in svg mode without throwing and renders cells", async () => {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    container.getBoundingClientRect = () =>
      ({
        width: 400,
        height: 300,
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(container);

    // Heatmap buffers live in the extended bundle; register them so addHeatmap
    // exercises the real WebGL buffer path (which the SVG renderer must survive).
    registerExtendedSeriesBuffers();

    const chart = createChart({
      container,
      width: 400,
      height: 300,
      renderer: "svg",
      animations: false,
      showLegend: false,
    });

    const w = 4;
    const h = 4;
    const xValues = Float32Array.from({ length: w }, (_, i) => i);
    const yValues = Float32Array.from({ length: h }, (_, i) => i);
    const zValues = Float32Array.from({ length: w * h }, (_, i) => i);

    // The SVG renderer lacks WebGL-only buffer methods (createColormapTexture),
    // so adding a heatmap must not throw. A throw here would abort the demo
    // before it can set the view bounds, collapsing the heatmap to one cell.
    expect(() =>
      chart.addHeatmap({
        id: "heatmap",
        data: { xValues, yValues, zValues },
        style: { colorScale: { name: "viridis", min: 0, max: w * h - 1 } },
      }),
    ).not.toThrow();

    chart.zoom({ x: [0, w - 1], y: [0, h - 1] });

    await vi.waitFor(
      () => chart.getActiveRenderer() === "svg" && container.querySelector("svg.velo-plot-svg-layer") != null,
      { timeout: 3000 },
    );

    chart.render();

    const svg = chart.exportSVG();
    const coloredCells = svg.match(/fill="rgb\(/g) ?? [];
    expect(coloredCells.length).toBeGreaterThan(1);

    chart.destroy();
    container.remove();
  });

  it("keeps overlay canvas visible for plugin UI in svg mode", async () => {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    container.getBoundingClientRect = () =>
      ({
        width: 400,
        height: 300,
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(container);

    const chart = createChart({
      container,
      width: 400,
      height: 300,
      renderer: "svg",
      animations: false,
      showLegend: false,
    });

    chart.addSeries({
      id: "line",
      type: "line",
      data: { x: Float32Array.from([0, 100]), y: Float32Array.from([1, 2]) },
    });

    chart.render();

    const canvases = container.querySelectorAll("canvas");
    const overlay = canvases[canvases.length - 1] as HTMLCanvasElement;
    expect(overlay.style.display).not.toBe("none");

    chart.destroy();
    container.remove();
  });

  it("draws crosshair on overlay canvas in svg mode", async () => {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    container.getBoundingClientRect = () =>
      ({
        width: 400,
        height: 300,
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(container);

    const chart = createChart({
      container,
      width: 400,
      height: 300,
      renderer: "svg",
      animations: false,
      showLegend: false,
    });

    chart.addSeries({
      id: "line",
      type: "line",
      data: {
        x: Float32Array.from([0, 50, 100]),
        y: Float32Array.from([10, 30, 20]),
      },
    });

    await vi.waitFor(
      () => chart.getActiveRenderer() === "svg" && container.querySelector("svg.velo-plot-svg-layer") != null,
      { timeout: 3000 },
    );
    chart.render();

    const overlay = container.querySelectorAll("canvas")[container.querySelectorAll("canvas").length - 1] as HTMLCanvasElement;
    const ctx = overlay.getContext("2d") as CanvasRenderingContext2D & { stroke: ReturnType<typeof vi.fn> };
    const strokesBefore = ctx.stroke.mock.calls.length;

    const rect = container.getBoundingClientRect();
    container.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: rect.left + 200,
        clientY: rect.top + 150,
        bubbles: true,
      }),
    );

    await vi.waitFor(() => ctx.stroke.mock.calls.length > strokesBefore, { timeout: 3000 });

    chart.destroy();
    container.remove();
  });

  it("does not paint cartesian axes on overlay in svg vector mode", async () => {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    container.getBoundingClientRect = () =>
      ({
        width: 400,
        height: 300,
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(container);

    const yAxisLabel = "TemperatureAxis";
    const chart = createChart({
      container,
      width: 400,
      height: 300,
      renderer: "svg",
      animations: false,
      showLegend: false,
      yAxis: { label: yAxisLabel },
    });

    const overlay = (chart as unknown as { overlay: import("../OverlayRenderer").OverlayRenderer }).overlay;
    const drawYAxis = vi.spyOn(overlay, "drawYAxis");
    const drawGrid = vi.spyOn(overlay, "drawGrid");

    chart.addSeries({
      id: "line",
      type: "line",
      data: {
        x: Float32Array.from([0, 50, 100]),
        y: Float32Array.from([10, 30, 20]),
      },
    });

    chart.render();
    await vi.waitFor(
      () => chart.exportSVG().includes(yAxisLabel),
      { timeout: 3000 },
    );

    expect(drawYAxis).not.toHaveBeenCalled();
    expect(drawGrid).not.toHaveBeenCalled();

    const labelMatches = chart.exportSVG().match(new RegExp(yAxisLabel, "g")) ?? [];
    expect(labelMatches.length).toBe(1);

    drawYAxis.mockRestore();
    drawGrid.mockRestore();
    chart.destroy();
    container.remove();
  });

  it("replaces radar SVG content on update without accumulating polygons", async () => {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    container.getBoundingClientRect = () =>
      ({
        width: 400,
        height: 300,
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(container);

    const chart = createChart({
      container,
      width: 400,
      height: 300,
      renderer: "svg",
      animations: false,
      showLegend: false,
    });

    const radarPlugin = PluginRadar({
      categories: ["Speed", "Power", "Reliability"],
      maxValue: 100,
      gridLevels: 3,
    });
    await chart.use(radarPlugin);

    const cats = ["Speed", "Power", "Reliability"] as const;
    radarPlugin.api!.addSeries({
      id: "a",
      name: "A",
      points: cats.map((category) => ({ category, value: 50 })),
      style: { color: "#00f2ff", fillColor: "rgba(0, 242, 255, 0.2)", width: 2 },
    });
    radarPlugin.api!.addSeries({
      id: "b",
      name: "B",
      points: cats.map((category) => ({ category, value: 70 })),
      style: { color: "#ff6b6b", fillColor: "rgba(255, 107, 107, 0.2)", width: 2 },
    });

    chart.render();

    await vi.waitFor(() => chart.exportSVG().includes("Speed"), { timeout: 3000 });

    const countPolygonsInExport = (svg: string) => svg.match(/<polygon/g)?.length ?? 0;
    const initialPolygons = countPolygonsInExport(chart.exportSVG());
    expect(initialPolygons).toBeGreaterThan(0);

    for (let i = 0; i < 5; i++) {
      radarPlugin.api!.updateSeries(
        "a",
        cats.map((category) => ({ category, value: 20 + Math.random() * 70 })),
      );
      radarPlugin.api!.updateSeries(
        "b",
        cats.map((category) => ({ category, value: 20 + Math.random() * 70 })),
      );
      chart.render();
      await vi.waitFor(
        () => countPolygonsInExport(chart.exportSVG()) === initialPolygons,
        { timeout: 3000 },
      );
    }

    const speedLabels = chart.exportSVG().match(/Speed/g) ?? [];
    expect(speedLabels.length).toBe(1);

    chart.destroy();
    container.remove();
  });
});
