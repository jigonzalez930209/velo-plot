import { assert, hostEl, lineData, ohlcData } from "./data.mjs";

export const stage2Scenarios = {
  "stage2-timescale-business-day": async (lib) => {
    const times = Float64Array.from([
      Date.UTC(2024, 0, 5),
      Date.UTC(2024, 0, 6),
      Date.UTC(2024, 0, 8),
    ]);
    const mapped = lib.mapToBusinessDayScale(times, { calendar: "business-day" });
    assert(mapped.scaledX[0] === 0, "friday index 0");
    assert(Number.isNaN(mapped.scaledX[1]), "saturday skipped");
    assert(mapped.scaledX[2] === 1, "monday index 1");
    assert(lib.isBusinessDay(Date.UTC(2024, 0, 8)), "monday is business day");
    return { mappedCount: mapped.timeByIndex.length };
  },

  "stage2-heikin-ashi": async (lib) => {
    const d = ohlcData(20);
    const ha = lib.computeHeikinAshi(d);
    assert(ha.close.length === 20, "heikin close length");
    assert(Number.isFinite(ha.open[1]), "heikin open finite");
    return { n: ha.close.length };
  },

  "stage2-candlestick-markers": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 360, animations: false });
    const d = ohlcData(40);
    chart.addSeries({ id: "c", type: "candlestick", data: d });
    const series = chart.getSeries("c");
    assert(series?.setMarkers, "candlestick series supports markers");
    series.setMarkers([
      { time: d.x[10], shape: "arrowUp", position: "belowBar", text: "Buy" },
      { time: d.x[30], shape: "arrowDown", position: "aboveBar", color: "#ef4444" },
    ]);
    chart.render();
    assert(series.getMarkers().length === 2, "markers set");
    chart.destroy();
  },

  "stage2-price-alerts": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 360, animations: false });
    const d = ohlcData(30);
    chart.addSeries({ id: "c", type: "candlestick", data: d });
    const fired = [];
    chart.on("alert", (e) => fired.push(e));
    chart.addAlert({ price: d.close[d.close.length - 1] - 1, direction: "above" });
    chart.updateSeries("c", {
      close: Float32Array.from(d.close, (v, i) => (i === d.close.length - 1 ? v + 5 : v)),
    });
    chart.render();
    assert(fired.length >= 1, "alert fired");
    chart.clearAlerts();
    chart.destroy();
  },

  "stage2-drawing-tools": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 360, animations: false });
    chart.addSeries({ id: "l", type: "line", data: lineData() });
    await chart.use(lib.PluginDrawingTools({ color: "#38bdf8" }));
    const drawing = chart.getPlugin("velo-plot-drawing-tools");
    assert(drawing?.setMode, "drawing plugin loaded");
    drawing.setMode("horizontal");
    chart.addAnnotation({ type: "horizontal-line", y: 55, color: "#38bdf8" });
    chart.setDrawingMode("trendline");
    assert(chart.getPlugin("velo-plot-drawing-tools")?.getMode() === "trendline", "drawing mode");
    chart.render();
    chart.destroy();
  },

  "stage2-replay": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 360, animations: false });
    chart.addSeries({ id: "candles", type: "candlestick", data: ohlcData(50) });
    await chart.use(lib.PluginReplay({ seriesId: "candles", frameMs: 50 }));
    const api = chart.getPlugin("velo-plot-replay");
    assert(api?.getLength() === 50, "replay buffer length");
    api.seek(10);
    assert(api.getIndex() === 10, "replay seek");
    api.step(2);
    api.play(2);
    api.pause();
    chart.destroy();
  },

  "stage2-hollow-candles": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 360, animations: false });
    const d = ohlcData(30);
    chart.addSeries({
      id: "c",
      type: "candlestick",
      data: d,
      style: { hollow: true, bullishColor: "#22c55e", bearishColor: "#ef4444" },
    });
    chart.render();
    chart.destroy();
  },

  "stage2-keyboard-plugin": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 360, animations: false });
    chart.addSeries({ id: "l", type: "line", data: lineData() });
    await chart.use(lib.PluginKeyboard());
    assert(chart.getPluginNames().includes("velo-plot-keyboard"), "keyboard plugin");
    chart.destroy();
  },
};
