import { describe, it, expect, vi } from "vitest";
import { resizeCanvases } from "./ChartSetup";

function mockContainer(width: number, height: number): HTMLDivElement {
  return {
    getBoundingClientRect: () =>
      ({
        width,
        height,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        toJSON: () => ({}),
      }) as DOMRect,
  } as HTMLDivElement;
}

function mockCanvas() {
  return {
    width: 0,
    height: 0,
    style: { width: "", height: "" } as CSSStyleDeclaration,
  } as HTMLCanvasElement;
}

function mockOverlayCtx() {
  let transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  return {
    setTransform: vi.fn((a: number, b: number, c: number, d: number, e: number, f: number) => {
      transform = { a, b, c, d, e, f };
    }),
    getTransform: () => transform,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high" as ImageSmoothingQuality,
  } as unknown as CanvasRenderingContext2D;
}

describe("resizeCanvases", () => {
  it("resizes the overlay when WebGL was already bumped by renderer.setDPR", () => {
    const container = mockContainer(400, 200);
    const webglCanvas = mockCanvas();
    const overlayCanvas = mockCanvas();
    const overlayCtx = mockOverlayCtx();

    // Simulate NativeWebGLRenderer.setDPR pre-sizing only the WebGL canvas.
    webglCanvas.width = 3200;
    webglCanvas.height = 1600;
    overlayCanvas.width = 800;
    overlayCanvas.height = 400;

    const changed = resizeCanvases(
      container,
      webglCanvas,
      overlayCanvas,
      overlayCtx,
      8
    );

    expect(changed).toBe(true);
    expect(overlayCanvas.width).toBe(3200);
    expect(overlayCanvas.height).toBe(1600);
    expect(webglCanvas.width).toBe(3200);
    expect(webglCanvas.height).toBe(1600);
    expect(overlayCtx.getTransform().a).toBe(8);
    expect(overlayCtx.getTransform().d).toBe(8);
  });

  it("always syncs the overlay transform even when backing stores already match", () => {
    const container = mockContainer(200, 100);
    const webglCanvas = mockCanvas();
    const overlayCanvas = mockCanvas();
    const overlayCtx = mockOverlayCtx();

    webglCanvas.width = 1600;
    webglCanvas.height = 800;
    webglCanvas.style.width = "200px";
    webglCanvas.style.height = "100px";
    overlayCanvas.width = 1600;
    overlayCanvas.height = 800;
    overlayCanvas.style.width = "200px";
    overlayCanvas.style.height = "100px";

    const changed = resizeCanvases(
      container,
      webglCanvas,
      overlayCanvas,
      overlayCtx,
      8
    );

    expect(changed).toBe(false);
    expect(overlayCtx.getTransform().a).toBe(8);
    expect(overlayCtx.getTransform().d).toBe(8);
  });
});
