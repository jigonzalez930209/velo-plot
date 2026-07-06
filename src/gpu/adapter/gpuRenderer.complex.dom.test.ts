/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { GpuRenderer } from "./gpuRenderer";
import { interleaveBoxPlotData, interleaveWaterfallData } from "../../renderer/native/utils";
import type { NativeSeriesRenderData } from "../../renderer/native/types";

function mockGpu(canvas: HTMLCanvasElement): GpuRenderer {
  const gpu = new GpuRenderer(canvas, { backend: "webgl" });
  const backend = {
    createOrUpdateBuffer: vi.fn(),
    renderWithBounds: vi.fn(),
    destroy: vi.fn(),
  };
  (gpu as any).backend = backend;
  (gpu as any).isInitialized = true;
  (gpu as any).backendType = "webgl";
  return gpu;
}

describe("GpuRenderer complex series", () => {
  it("renderNativeSeries uploads boxplot buffers", () => {
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "clientWidth", { value: 400 });
    Object.defineProperty(canvas, "clientHeight", { value: 300 });
    const gpu = mockGpu(canvas);

    const n = 20;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const { lines, boxes } = interleaveBoxPlotData(
      x,
      x,
      Float32Array.from({ length: n }, (_, i) => i + 1),
      Float32Array.from({ length: n }, (_, i) => i + 2),
      Float32Array.from({ length: n }, (_, i) => i + 3),
      Float32Array.from({ length: n }, (_, i) => i + 4),
      0.8,
    );

    gpu.createBuffer("bp_box_faces", boxes);
    gpu.createBuffer("bp_box_lines", lines);

    gpu.renderNativeSeries(
      [{
        id: "bp",
        buffer: {} as WebGLBuffer,
        count: 0,
        style: { color: "#00f2ff" },
        visible: true,
        type: "boxplot",
        boxCount: n * 6,
        boxLinesCount: n * 10,
      }],
      { bounds: { xMin: 0, xMax: n, yMin: 0, yMax: 10 }, dpr: 1 },
    );

    const backend = (gpu as any).backend;
    expect(backend.createOrUpdateBuffer).toHaveBeenCalled();
    expect(backend.renderWithBounds).toHaveBeenCalled();
    gpu.destroy();
  });

  it("renderNativeSeries uploads waterfall buffers", () => {
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "clientWidth", { value: 400 });
    Object.defineProperty(canvas, "clientHeight", { value: 300 });
    const gpu = mockGpu(canvas);

    const n = 12;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const y = Float32Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 5 : -3));
    const wf = interleaveWaterfallData(x, y, 0.6);

    gpu.createBuffer("wf_wf_positive", wf.positiveData);
    gpu.createBuffer("wf_wf_negative", wf.negativeData);
    gpu.createBuffer("wf_wf_subtotal", wf.subtotalData);
    gpu.createBuffer("wf_wf_connectors", wf.connectorData);

    gpu.renderNativeSeries(
      [{
        id: "wf",
        buffer: {} as WebGLBuffer,
        count: 0,
        style: { color: "#fff" },
        visible: true,
        type: "waterfall",
        wfPositiveCount: wf.positiveCount,
        wfNegativeCount: wf.negativeCount,
        wfSubtotalCount: wf.subtotalCount,
        wfConnectorCount: wf.connectorData.length / 2,
      }],
      { bounds: { xMin: 0, xMax: n, yMin: -10, yMax: 10 }, dpr: 1 },
    );

    const backend = (gpu as any).backend;
    expect(backend.createOrUpdateBuffer.mock.calls.length).toBeGreaterThanOrEqual(3);
    gpu.destroy();
  });
});
