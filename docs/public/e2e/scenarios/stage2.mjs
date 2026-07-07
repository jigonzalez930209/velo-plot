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

  "stage2-business-day-chart": async (lib) => {
    const chart = lib.createChart({
      container: hostEl(),
      width: 640,
      height: 360,
      animations: false,
      xAxis: { type: "time", timeScale: { calendar: "business-day" } },
    });
    const times = Float64Array.from([
      Date.UTC(2024, 0, 5),
      Date.UTC(2024, 0, 6),
      Date.UTC(2024, 0, 8),
    ]);
    const d = ohlcData(3);
    d.x = times;
    chart.addSeries({ id: "c", type: "candlestick", data: d });
    const x = chart.getSeries("c").getData().x;
    assert(x[0] === 0, "friday logical 0");
    assert(Number.isNaN(x[1]), "saturday skipped in series");
    assert(x[2] === 1, "monday logical 1");
    chart.render();
    chart.destroy();
  },

  "stage2-heikin-ashi-series": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 360, animations: false });
    const d = ohlcData(25);
    chart.addSeries({ id: "ha", type: "heikin-ashi", data: d });
    const series = chart.getSeries("ha");
    assert(series?.getType() === "candlestick", "heikin-ashi renders as candlestick");
    chart.render();
    chart.destroy();
  },

  "stage2-get-alerts": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 360, animations: false });
    chart.addSeries({ id: "c", type: "candlestick", data: ohlcData(20) });
    const id = chart.addAlert({ price: 50, direction: "below" });
    assert(chart.getAlerts().length === 1, "getAlerts returns active alert");
    assert(chart.removeAlert(id), "removeAlert works");
    assert(chart.getAlerts().length === 0, "alerts cleared after remove");
    chart.destroy();
  },

  "stage2-position-lines": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 360, animations: false });
    chart.addSeries({ id: "c", type: "candlestick", data: ohlcData(30) });
    await chart.use(lib.PluginAnnotations());
    chart.addPositionLine({ price: 102, style: "entry" });
    chart.addPositionLine({ price: 98, style: "sl" });
    chart.addPositionLine({ price: 108, style: "tp" });
    assert(chart.getAnnotations().length === 3, "position lines as annotations");
    chart.render();
    chart.destroy();
  },

  "stage2-drawing-fibonacci": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 360, animations: false });
    chart.addSeries({ id: "l", type: "line", data: lineData() });
    await chart.use(lib.PluginAnnotations());
    await chart.use(lib.PluginDrawingTools({ color: "#f59e0b" }));
    chart.setDrawingMode("fibonacci");
    chart.events.emit("click", { point: { x: 10, y: 40 } });
    chart.events.emit("click", { point: { x: 50, y: 80 } });
    assert(chart.getAnnotations().length >= 5, "fibonacci levels drawn");
    chart.destroy();
  },

  "stage2-stochastic-indicator": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 360, animations: false });
    chart.addSeries({ id: "c", type: "candlestick", data: ohlcData(80) });
    const result = await chart.addIndicator("stochastic", { period: 14, signalPeriod: 3 });
    assert(result.preset === "stochastic", "stochastic preset");
    assert(result.seriesIds.length > 0, "stochastic series added");
    chart.destroy();
  },

  "stage2-mock-datafeed": async (lib) => {
    const feed = lib.createMockDatafeed({ seed: 7 });
    const info = await feed.resolveSymbol("MOCK");
    assert(info.symbol === "MOCK", "resolveSymbol");
    const bars = await feed.getBars({
      symbol: "MOCK",
      resolution: "1",
      from: Date.UTC(2024, 0, 1),
      to: Date.UTC(2024, 0, 2),
    });
    assert(bars.length > 0, "getBars returns history");
    const ohlc = lib.barsToOhlc(bars);
    assert(ohlc.close.length === bars.length, "barsToOhlc");
    return { barCount: bars.length };
  },
};
