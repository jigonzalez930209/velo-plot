import { describe, it, expect } from "vitest";
import { findNearestBarIndex, snapToCandle } from "./snapToCandle";

describe("snapToCandle", () => {
  const barX = Float32Array.from([0, 1, 2, 3]);
  const open = Float32Array.from([10, 11, 12, 13]);
  const high = Float32Array.from([15, 16, 17, 18]);
  const low = Float32Array.from([8, 9, 10, 11]);
  const close = Float32Array.from([12, 13, 14, 15]);

  const dataToPixelX = (x: number) => x * 10;
  const dataToPixelY = (y: number) => 200 - y * 10;

  it("findNearestBarIndex picks closest bar", () => {
    expect(findNearestBarIndex(barX, 2.1)).toBe(2);
    expect(findNearestBarIndex(barX, 0.4)).toBe(0);
  });

  it("returns original point when magnet disabled", () => {
    const result = snapToCandle({
      x: 1.5,
      y: 12.3,
      barX,
      open,
      high,
      low,
      close,
      dataToPixelX,
      dataToPixelY,
      enabled: false,
    });
    expect(result).toEqual({ x: 1.5, y: 12.3 });
  });

  it("snaps x to nearest bar and y to nearest OHLC within threshold", () => {
    const result = snapToCandle({
      x: 1.6,
      y: 14.2,
      barX,
      open,
      high,
      low,
      close,
      dataToPixelX,
      dataToPixelY,
      pixelThreshold: 20,
      enabled: true,
    });
    expect(result.x).toBe(2);
    expect(result.y).toBe(14);
  });
});
