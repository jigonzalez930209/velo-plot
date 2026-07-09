/**
 * Series diffing for declarative bindings.
 */

import type { SeriesOptions, SeriesUpdateData } from "../../types";
import type {
  ChartSeriesActions,
  VeloPlotSeries,
  VeloPlotCandlestickSeries,
  VeloPlotBarSeries,
  VeloPlotHeatmapSeries,
} from "./types";

function isCandlestick(s: VeloPlotSeries): s is VeloPlotCandlestickSeries {
  return s.type === "candlestick";
}

function isBar(s: VeloPlotSeries): s is VeloPlotBarSeries {
  return s.type === "bar";
}

function isHeatmap(s: VeloPlotSeries): s is VeloPlotHeatmapSeries {
  return s.type === "heatmap";
}

export function veloPlotSeriesToOptions(series: VeloPlotSeries): SeriesOptions {
  const style = {
    color: series.color ?? "#ff0055",
    width: series.width ?? 1.5,
  };

  if (isHeatmap(series)) {
    return {
      id: series.id,
      type: "heatmap",
      data: series.data as unknown as import("../../types").SeriesData,
      style,
      visible: series.visible ?? true,
      name: series.name,
    };
  }

  if (isCandlestick(series)) {
    return {
      id: series.id,
      type: "candlestick",
      data: {
        x: series.x,
        y: series.close,
        open: series.open,
        high: series.high,
        low: series.low,
        close: series.close,
      },
      style,
      visible: series.visible ?? true,
      name: series.name,
    };
  }

  if (isBar(series)) {
    return {
      id: series.id,
      type: "bar",
      data: { x: series.x, y: series.y },
      style,
      visible: series.visible ?? true,
      name: series.name,
    };
  }

  return {
    id: series.id,
    type: "line",
    data: { x: series.x, y: series.y },
    style,
    visible: series.visible ?? true,
    name: series.name,
  };
}

function seriesDataChanged(
  prev: VeloPlotSeries,
  next: VeloPlotSeries,
): boolean {
  if (prev.type !== next.type) return true;

  if (isHeatmap(prev) && isHeatmap(next)) {
    return (
      prev.data.xValues !== next.data.xValues ||
      prev.data.yValues !== next.data.yValues ||
      prev.data.zValues !== next.data.zValues
    );
  }

  if (isCandlestick(prev) && isCandlestick(next)) {
    return (
      prev.x !== next.x ||
      prev.open !== next.open ||
      prev.high !== next.high ||
      prev.low !== next.low ||
      prev.close !== next.close
    );
  }

  if (isBar(prev) && isBar(next)) {
    return prev.x !== next.x || prev.y !== next.y;
  }

  if ("x" in prev && "y" in prev && "x" in next && "y" in next) {
    return prev.x !== next.x || prev.y !== next.y;
  }

  return true;
}

function toUpdateData(series: VeloPlotSeries): SeriesUpdateData {
  if (isHeatmap(series)) {
    return {
      x: series.data.xValues as Float32Array,
      y: series.data.yValues as Float32Array,
    };
  }
  if (isCandlestick(series)) {
    return {
      x: series.x,
      open: series.open,
      high: series.high,
      low: series.low,
      close: series.close,
    };
  }
  if (isBar(series)) {
    return { x: series.x, y: series.y };
  }
  return { x: series.x, y: series.y };
}

export function diffSeries(
  chart: ChartSeriesActions,
  current: VeloPlotSeries[],
  previous: Map<string, VeloPlotSeries>,
): Map<string, VeloPlotSeries> {
  const currentMap = new Map(current.map((s) => [s.id, s]));

  previous.forEach((_, id) => {
    if (!currentMap.has(id)) {
      chart.removeSeries(id);
    }
  });

  currentMap.forEach((seriesData, id) => {
    const prev = previous.get(id);
    if (!prev) {
      chart.addSeries(veloPlotSeriesToOptions(seriesData));
      if (currentMap.size === 1) {
        chart.autoScale?.();
      }
    } else if (seriesDataChanged(prev, seriesData)) {
      chart.updateSeries(id, toUpdateData(seriesData));
    }
  });

  return currentMap;
}

export function serializePaneIds(panes: { id: string }[]): string {
  return panes.map((p) => p.id).join(",");
}
