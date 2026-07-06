/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { createGpuChartRenderer } from "./GpuChartRenderer";
import { WebGPUBackend } from "../gpu/backends/webgpu/WebGPUBackend";

describe("GpuChartRenderer", () => {
  it("returns null when WebGPU is not supported", async () => {
    vi.spyOn(WebGPUBackend, "isSupported").mockReturnValue(false);
    const canvas = document.createElement("canvas");
    const renderer = await createGpuChartRenderer(canvas, { backend: "webgpu" });
    expect(renderer).toBeNull();
    vi.restoreAllMocks();
  });
});
