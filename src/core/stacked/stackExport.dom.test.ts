/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportStackImage } from "./stackExport";
import type { Chart } from "../chart/types";

const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

class MockImage {
  width = 100;
  height = 80;
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  private _src = "";
  set src(value: string) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this._src;
  }
}

function installCanvasMock() {
  const fillRect = vi.fn();
  const drawImage = vi.fn();

  HTMLCanvasElement.prototype.getContext = vi.fn(function (
    this: HTMLCanvasElement,
    type: string,
  ) {
    if (type !== "2d") return null;
    return {
      fillStyle: "",
      fillRect,
      drawImage,
      canvas: this,
    } as unknown as CanvasRenderingContext2D;
  }) as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toDataURL = vi.fn(function (
    this: HTMLCanvasElement,
    mime?: string,
    _quality?: number,
  ) {
    if (mime?.includes("jpeg")) return "data:image/jpeg;base64,abc";
    if (mime?.includes("webp")) return "data:image/webp;base64,abc";
    return "data:image/png;base64,abc";
  });

  return { fillRect, drawImage };
}

function mockChart(overrides: Partial<Chart> = {}): Chart {
  return {
    getDPR: () => 1,
    setDPR: vi.fn(),
    render: vi.fn(),
    exportImage: vi.fn(() => PNG_1X1),
    ...overrides,
  } as unknown as Chart;
}

function layoutEl(
  left: number,
  top: number,
  width: number,
  height: number,
): HTMLDivElement {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    ({
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
  return el;
}

describe("exportStackImage (DOM)", () => {
  let canvasMocks: ReturnType<typeof installCanvasMock>;

  beforeEach(() => {
    canvasMocks = installCanvasMock();
    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("composites pane images into a PNG data URL", async () => {
    const container = layoutEl(0, 0, 400, 300);
    const paneA = layoutEl(0, 0, 400, 150);
    const paneB = layoutEl(0, 150, 400, 150);
    const charts = [mockChart(), mockChart()];

    const result = await exportStackImage(
      container,
      [paneA, paneB],
      charts,
      [],
      "#0b0e14",
    );

    expect(result.startsWith("data:image/png")).toBe(true);
    expect(charts[0].exportImage).toHaveBeenCalled();
    expect(charts[1].exportImage).toHaveBeenCalled();
    expect(canvasMocks.drawImage).toHaveBeenCalledTimes(2);
    expect(canvasMocks.fillRect).toHaveBeenCalled();
  });

  it("supports jpeg, webp, transparent, and divider overlays", async () => {
    const container = layoutEl(0, 0, 200, 100);
    const pane = layoutEl(0, 0, 200, 100);
    const divider = layoutEl(0, 50, 200, 6);
    const chart = mockChart();

    const jpeg = await exportStackImage(container, [pane], [chart], [divider], "#fff", {
      format: "jpeg",
      quality: 0.8,
    });
    expect(jpeg.startsWith("data:image/jpeg")).toBe(true);

    const webp = await exportStackImage(container, [pane], [chart], [], "#fff", {
      format: "webp",
    });
    expect(webp.startsWith("data:image/webp")).toBe(true);

    const transparent = await exportStackImage(container, [pane], [chart], [], "#fff", {
      transparent: true,
      includeBackground: false,
    });
    expect(transparent.startsWith("data:image/png")).toBe(true);

    canvasMocks.fillRect.mockClear();
    await exportStackImage(container, [pane], [chart], [divider], "#fff", {
      includeDividers: true,
    });
    expect(canvasMocks.fillRect.mock.calls.length).toBeGreaterThan(1);
  });

  it("boosts DPR for high-res export and restores afterward", async () => {
    const container = layoutEl(0, 0, 100, 100);
    const pane = layoutEl(0, 0, 100, 100);
    const setDPR = vi.fn();
    const render = vi.fn();
    const chart = mockChart({ getDPR: () => 2, setDPR, render });

    await exportStackImage(container, [pane], [chart], [], "#111", {
      resolution: "2k",
    });

    expect(setDPR).toHaveBeenCalledWith(4);
    expect(render).toHaveBeenCalled();
    expect(setDPR).toHaveBeenLastCalledWith(2);
  });

  it("uses setDevicePixelRatioOverride when available for high-res export", async () => {
    const container = layoutEl(0, 0, 100, 100);
    const pane = layoutEl(0, 0, 100, 100);
    const setDevicePixelRatioOverride = vi.fn();
    const setDPR = vi.fn();
    const render = vi.fn();
    const chart = mockChart({ getDPR: () => 2, setDevicePixelRatioOverride, setDPR, render });

    await exportStackImage(container, [pane], [chart], [], "#111", {
      resolution: "4k",
    });

    // Boost via the override (survives resize), never via plain setDPR.
    expect(setDevicePixelRatioOverride).toHaveBeenCalledWith(8);
    // Restored by clearing the override.
    expect(setDevicePixelRatioOverride).toHaveBeenLastCalledWith(null);
    expect(setDPR).not.toHaveBeenCalled();
  });

  it("skips dividers when includeDividers is false", async () => {
    const container = layoutEl(0, 0, 100, 100);
    const pane = layoutEl(0, 0, 100, 100);
    const divider = layoutEl(0, 50, 100, 4);
    const chart = mockChart();
    canvasMocks.fillRect.mockClear();

    const url = await exportStackImage(
      container,
      [pane],
      [chart],
      [divider],
      "#fff",
      { includeDividers: false },
    );
    expect(url.startsWith("data:image/png")).toBe(true);
    expect(canvasMocks.fillRect).toHaveBeenCalledTimes(1);
  });

  it("falls back to window devicePixelRatio when no charts are provided", async () => {
    vi.stubGlobal("devicePixelRatio", 1.5);
    const container = layoutEl(0, 0, 80, 60);

    const result = await exportStackImage(container, [], [], [], "", {
      resolution: 1,
    });

    expect(result.startsWith("data:image/png")).toBe(true);
  });

  it("throws when canvas context is unavailable", async () => {
    HTMLCanvasElement.prototype.getContext = () => null;

    const container = layoutEl(0, 0, 10, 10);
    const pane = layoutEl(0, 0, 10, 10);

    await expect(
      exportStackImage(container, [pane], [mockChart()], [], "#fff"),
    ).rejects.toThrow(/export canvas/i);
  });
});
