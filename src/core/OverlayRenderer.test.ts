import { describe, it, expect, vi } from "vitest";
import { OverlayRenderer } from "./OverlayRenderer";
import { LinearScale } from "../scales";
import type { ChartTheme } from "../theme";

const minimalTheme = {
  xAxis: {
    lineColor: "#fff",
    lineWidth: 1,
    labelColor: "#fff",
    labelSize: 10,
    fontFamily: "sans-serif",
    tickColor: "#fff",
    tickLength: 4,
    titleSize: 12,
    titleColor: "#fff",
  },
  yAxis: {
    lineColor: "#fff",
    lineWidth: 1,
    labelColor: "#fff",
    labelSize: 10,
    fontFamily: "sans-serif",
    tickColor: "#fff",
    tickLength: 4,
    titleSize: 12,
    titleColor: "#fff",
  },
  plotBorderColor: "#333",
} as ChartTheme;

function createMockCtx() {
  return {
    strokeStyle: "",
    lineWidth: 0,
    fillStyle: "",
    font: "",
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "top" as CanvasTextBaseline,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe("OverlayRenderer axis visibility flags", () => {
  const plotArea = { x: 50, y: 20, width: 400, height: 300 };

  it("drawXAxis skips line, ticks and labels when all hidden", () => {
    const ctx = createMockCtx();
    const renderer = new OverlayRenderer(ctx, minimalTheme);
    const scale = new LinearScale();
    scale.setDomain(0, 100);
    scale.setRange(50, 450);

    renderer.drawXAxis(plotArea, scale, {
      showLine: false,
      showTicks: false,
      showLabels: false,
    });

    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it("drawXAxis draws line but not labels when showLabels is false", () => {
    const ctx = createMockCtx();
    const renderer = new OverlayRenderer(ctx, minimalTheme);
    const scale = new LinearScale();
    scale.setDomain(0, 100);
    scale.setRange(50, 450);

    renderer.drawXAxis(plotArea, scale, {
      showLine: true,
      showTicks: true,
      showLabels: false,
    });

    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it("drawYAxis skips rendering when all visibility flags are false", () => {
    const ctx = createMockCtx();
    const renderer = new OverlayRenderer(ctx, minimalTheme);
    const scale = new LinearScale();
    scale.setDomain(0, 100);
    scale.setRange(320, 20);

    renderer.drawYAxis(plotArea, scale, {
      showLine: false,
      showTicks: false,
      showLabels: false,
    });

    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });
});
