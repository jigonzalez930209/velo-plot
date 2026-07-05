import { describe, it, expect } from "vitest";
import {
  formatDataPointX,
  formatDataPointY,
  formatCrosshairX,
  formatCrosshairY,
  formatCompactValue,
} from "./format";
import type { DataPointTooltip, CrosshairTooltip } from "./types";

const timeAxisFormat = {
  x: { type: "time" as const },
  xSpan: 86400000 * 30,
};

const priceAxisFormat = {
  y: { scientific: false as const },
};

function baseDataPoint(overrides: Partial<DataPointTooltip> = {}): DataPointTooltip {
  return {
    type: "datapoint",
    seriesId: "btc",
    seriesName: "BTC",
    seriesColor: "#f7931a",
    dataIndex: 0,
    dataX: Date.UTC(2024, 5, 15, 12, 0, 0),
    dataY: 62340,
    pixelX: 100,
    pixelY: 200,
    ...overrides,
  };
}

describe("tooltip format", () => {
  describe("formatDataPointX", () => {
    it("formats epoch-ms as date when axis type is time", () => {
      const label = formatDataPointX(baseDataPoint({ axisFormat: timeAxisFormat }));
      expect(label).not.toMatch(/^1\.7/);
      expect(label).not.toMatch(/^\d+\.?\d*e/i);
    });

    it("falls back to exponential for raw epoch without axis context", () => {
      const label = formatDataPointX(baseDataPoint());
      expect(label).toMatch(/e/i);
    });
  });

  describe("formatDataPointY", () => {
    it("shows readable price when scientific:false", () => {
      const label = formatDataPointY(baseDataPoint({ axisFormat: priceAxisFormat }));
      expect(label).not.toMatch(/e/i);
      expect(label).toMatch(/62/);
    });
  });

  describe("formatCrosshair", () => {
    it("formats crosshair header X as date with time axis", () => {
      const data: CrosshairTooltip = {
        type: "crosshair",
        cursorX: 100,
        cursorY: 200,
        dataX: Date.UTC(2024, 5, 15),
        interpolatedValues: [],
        axisFormat: timeAxisFormat,
      };
      expect(formatCrosshairX(data)).not.toMatch(/^1\.7/);
    });

    it("formats series Y values with axis context", () => {
      const data: CrosshairTooltip = {
        type: "crosshair",
        cursorX: 100,
        cursorY: 200,
        dataX: 0,
        interpolatedValues: [],
        axisFormat: priceAxisFormat,
      };
      expect(formatCrosshairY(62340, data)).not.toMatch(/e/i);
    });
  });

  describe("formatCompactValue", () => {
    it("uses time formatter for x when axis type is time", () => {
      const label = formatCompactValue(
        baseDataPoint({ axisFormat: timeAxisFormat }),
        "x",
      );
      expect(label).not.toMatch(/^1\.7/);
    });

    it("uses axis Y formatter for compact y display", () => {
      const label = formatCompactValue(
        baseDataPoint({ axisFormat: priceAxisFormat }),
        "y",
      );
      expect(label).not.toMatch(/e/i);
    });
  });
});

describe("CrosshairTooltipTemplate", () => {
  it("measure produces date-like header width for time axis data", async () => {
    const { crosshairTooltipTemplate } = await import("./templates/CrosshairTemplate");
    const measured: string[] = [];
    const ctx = {
      font: "",
      measureText: (text: string) => {
        measured.push(text);
        return { width: text.length * 8 };
      },
    } as unknown as CanvasRenderingContext2D;

    const data: CrosshairTooltip = {
      type: "crosshair",
      cursorX: 50,
      cursorY: 50,
      dataX: Date.UTC(2024, 5, 15),
      axisFormat: timeAxisFormat,
      interpolatedValues: [
        {
          seriesId: "btc",
          seriesName: "BTC",
          seriesColor: "#f7931a",
          x: Date.UTC(2024, 5, 15),
          y: 62000,
          isInterpolated: false,
        },
      ],
    };

    const theme = {
      fontFamily: "sans-serif",
      titleFontSize: 12,
      titleFontWeight: 600,
      contentFontSize: 11,
      lineHeight: 1.4,
      showSeriesIndicator: true,
      seriesIndicatorSize: 8,
      padding: { top: 8, right: 10, bottom: 8, left: 10 },
    } as import("./types").TooltipTheme;

    crosshairTooltipTemplate.measure(ctx, data, theme);

    const header = measured.find((s) => s.startsWith("⌖ X = "));
    expect(header).toBeDefined();
    expect(header).not.toMatch(/1\.7\d+e/);
  });
});
