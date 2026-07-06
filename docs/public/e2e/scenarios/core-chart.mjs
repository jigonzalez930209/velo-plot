import { assert, hostEl, lineData, ohlcData, boxplotData, waterfallData, heatmapData } from "./data.mjs";

function baseChart(lib, extra = {}) {
  return lib.createChart({
    container: hostEl(),
    width: 720,
    height: 400,
    animations: false,
    ...extra,
  });
}

export const coreChartScenarios = {
  "chart-creates-and-renders": async (lib) => {
    const chart = baseChart(lib);
    chart.addSeries({ id: "line", type: "line", data: lineData() });
    chart.render();
    const bounds = chart.getViewBounds();
    assert(bounds.xMax > bounds.xMin, "view bounds invalid");
    chart.destroy();
    return { bounds };
  },

  "chart-line-series": async (lib) => {
    const chart = baseChart(lib);
    chart.addSeries({ id: "l", type: "line", data: lineData(100) });
    chart.render();
    assert(chart.getSeries("l")?.getPointCount() === 100, "line point count");
    chart.destroy();
  },

  "chart-scatter-series": async (lib) => {
    const chart = baseChart(lib);
    chart.addSeries({ id: "s", type: "scatter", data: lineData(40) });
    chart.render();
    assert(chart.getSeries("s")?.getType() === "scatter", "scatter type");
    chart.destroy();
  },

  "chart-bar-series": async (lib) => {
    const chart = baseChart(lib);
    chart.addSeries({ id: "b", type: "bar", data: lineData(30) });
    chart.render();
    chart.destroy();
  },

  "chart-area-series": async (lib) => {
    const chart = baseChart(lib);
    const { x, y } = lineData(40);
    chart.addSeries({ id: "a", type: "area", data: { x, y, y2: Float32Array.from(y, (v) => v - 5) } });
    chart.render();
    chart.destroy();
  },

  "chart-step-series": async (lib) => {
    const chart = baseChart(lib);
    chart.addSeries({ id: "st", type: "step", data: lineData(25), style: { stepMode: "after" } });
    chart.render();
    chart.destroy();
  },

  "chart-band-series": async (lib) => {
    const chart = baseChart(lib);
    const { x, y } = lineData(30);
    const y2 = Float32Array.from(y, (v) => v - 8);
    chart.addSeries({ id: "band", type: "band", data: { x, y, y2 } });
    chart.render();
    chart.destroy();
  },

  "chart-candlestick-series": async (lib) => {
    const chart = baseChart(lib);
    const d = ohlcData(60);
    chart.addSeries({
      id: "ohlc",
      type: "candlestick",
      data: d,
      style: { bullishColor: "#22c55e", bearishColor: "#ef4444" },
    });
    chart.render();
    assert(chart.getSeries("ohlc")?.getType() === "candlestick", "candlestick");
    chart.destroy();
  },

  "chart-boxplot-series": async (lib) => {
    const chart = baseChart(lib);
    chart.addSeries({ id: "bp", type: "boxplot", data: boxplotData() });
    chart.render();
    chart.destroy();
  },

  "chart-waterfall-series": async (lib) => {
    const chart = baseChart(lib);
    chart.addSeries({ id: "wf", type: "waterfall", data: waterfallData() });
    chart.render();
    chart.destroy();
  },

  "chart-heatmap-series": async (lib) => {
    const chart = baseChart(lib);
    chart.addSeries({ id: "hm", type: "heatmap", data: heatmapData() });
    chart.render();
    chart.destroy();
  },

  "chart-zoom-fit-export": async (lib) => {
    const chart = baseChart(lib);
    chart.addSeries({ id: "l", type: "line", data: lineData(200) });
    chart.zoom({ x: [10, 50], animate: false });
    chart.fit();
    chart.autoScale(false);
    chart.resetZoom();
    chart.render();
    const png = chart.exportImage("png");
    assert(typeof png === "string" && png.startsWith("data:image"), "export png");
    chart.destroy();
    return { pngLength: png.length };
  },

  "chart-annotations": async (lib) => {
    const chart = baseChart(lib);
    chart.addSeries({ id: "l", type: "line", data: lineData() });
    await chart.use(lib.PluginAnnotations());
    chart.addAnnotation({ type: "horizontal-line", y: 50, color: "#f59e0b" });
    chart.addAnnotation({ type: "vertical-line", x: 20, color: "#38bdf8" });
    chart.render();
    const all = chart.getAnnotations?.() ?? [];
    assert(all.length >= 2, "annotations added");
    chart.destroy();
  },

  "chart-cursor-crosshair": async (lib) => {
    const chart = baseChart(lib);
    chart.addSeries({ id: "l", type: "line", data: lineData() });
    chart.enableCursor({ enabled: true, crosshair: true, snap: true });
    chart.render();
    chart.destroy();
  },

  "chart-theme-responsive": async (lib) => {
    const chart = baseChart(lib, { theme: "midnight", responsive: true });
    chart.addSeries({ id: "l", type: "line", data: lineData() });
    chart.setTheme("light");
    chart.render();
    chart.resize();
    chart.destroy();
  },
};
