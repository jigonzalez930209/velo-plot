import { assert, hostEl, lineData, ohlcData } from "./data.mjs";

export const pluginScenarios = {
  "plugin-virtualization": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 800, height: 400, animations: false });
    const n = 50_000;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const y = Float32Array.from({ length: n }, (_, i) => Math.sin(i * 0.002) * 50);
    chart.addSeries({ id: "big", type: "line", data: { x, y } });
    await chart.use(lib.PluginVirtualization({ targetPoints: 800 }));
    chart.render();
    await new Promise((r) => requestAnimationFrame(r));
    const count = chart.getSeries("big")?.getPointCount() ?? n;
    assert(count <= 1200, `virtualized point count ${count}`);
    chart.destroy();
    return { pointCount: count };
  },

  "plugin-virtualization-candlestick": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 800, height: 400, animations: false });
    const n = 20_000;
    const d = ohlcData(n);
    chart.addSeries({ id: "ohlc", type: "candlestick", data: d });
    await chart.use(lib.PluginVirtualization({ targetPoints: 600, strategy: "minmax" }));
    chart.render();
    await new Promise((r) => setTimeout(r, 100));
    chart.destroy();
  },

  "plugin-caching": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 320, animations: false });
    chart.addSeries({ id: "l", type: "line", data: lineData() });
    await chart.use(lib.PluginCaching({ autoInvalidate: true }));
    const caching = chart.caching;
    if (caching?.set) {
      caching.set("test-key", { ok: true }, { tags: ["bounds"] });
      assert(caching.has("test-key"), "cache set");
    }
    chart.render();
    chart.destroy();
  },

  "plugin-lazy-load": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 320, animations: false });
    const n = 100_000;
    const x = Float32Array.from({ length: n }, (_, i) => i);
    const y = Float32Array.from({ length: n }, (_, i) => i * 0.01);
    chart.addSeries({ id: "lazy", type: "line", data: { x, y } });
    await chart.use(lib.PluginLazyLoad({ chunkSize: 5000 }));
    chart.render();
    chart.destroy();
  },

  "plugin-analysis-indicators": async (lib) => {
    const closes = Float32Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i * 0.1) * 10);
    const rsiValues = lib.rsi(closes, 14);
    const emaValues = lib.ema(closes, 20);
    const macdResult = lib.macd(closes, 12, 26, 9);
    assert(rsiValues.length === 100, "rsi length");
    assert(emaValues.length === 100, "ema length");
    assert(macdResult.values.length === 100, "macd length");
    return { rsiLast: rsiValues[rsiValues.length - 1] };
  },

  "plugin-snapshot-export": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 320, animations: false });
    chart.addSeries({ id: "l", type: "line", data: lineData() });
    await chart.use(lib.PluginSnapshot());
    chart.render();
    const png = chart.exportImage("png");
    assert(png.startsWith("data:image"), "snapshot png");
    chart.destroy();
  },

  "plugin-streaming-smoke": async (lib) => {
    assert(typeof lib.PluginStreaming === "function", "PluginStreaming export");
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 320, animations: false });
    chart.addSeries({ id: "l", type: "line", data: lineData(10) });
    await chart.use(lib.PluginStreaming());
    chart.appendData("l", Float32Array.from([10]), Float32Array.from([55]));
    chart.destroy();
  },

  "plugin-tools-delta-peak": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 320, animations: false });
    chart.addSeries({ id: "l", type: "line", data: lineData(80) });
    await chart.use(lib.PluginTools());
    chart.setMode("delta");
    chart.setMode("peak");
    chart.setMode("pan");
    chart.render();
    chart.destroy();
  },

  "plugin-regression-smoke": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 320, animations: false });
    chart.addSeries({ id: "l", type: "line", data: lineData(40) });
    await chart.use(lib.PluginRegression());
    chart.render();
    chart.destroy();
  },

  "plugin-forecasting-smoke": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 320, animations: false });
    chart.addSeries({ id: "l", type: "line", data: lineData(50) });
    await chart.use(lib.PluginForecasting());
    chart.render();
    chart.destroy();
  },

  "plugin-data-export": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 320, animations: false });
    chart.addSeries({ id: "l", type: "line", data: lineData(20) });
    await chart.use(lib.PluginDataExport());
    chart.render();
    chart.destroy();
  },

  "plugin-i18n-smoke": async (lib) => {
    const chart = lib.createChart({ container: hostEl(), width: 640, height: 320, animations: false });
    chart.addSeries({ id: "l", type: "line", data: lineData() });
    await chart.use(lib.PluginI18n({ locale: "es" }));
    chart.render();
    chart.destroy();
  },
};

export const utilityScenarios = {
  "util-scales-linear-log": async (lib) => {
    const linear = lib.createScale("linear");
    linear.setDomain(0, 100);
    linear.setRange(0, 500);
    assert(linear.transform(50) === 250, "linear midpoint");
    const log = lib.createScale("log");
    log.setDomain(1, 1000);
    log.setRange(0, 400);
    assert(log.transform(10) > 0, "log transform");
  },

  "util-chart-group-sync": async (lib) => {
    const c1 = lib.createChart({ container: hostEl(), width: 360, height: 200, animations: false });
    const div2 = document.createElement("div");
    div2.style.cssText = "width:360px;height:200px";
    hostEl().appendChild(div2);
    const c2 = lib.createChart({ container: div2, width: 360, height: 200, animations: false });
    c1.addSeries({ id: "a", type: "line", data: lineData() });
    c2.addSeries({ id: "b", type: "line", data: lineData() });
    const group = lib.createChartGroup([c1, c2]).syncAxis("x");
    group.fitAll();
    group.destroy();
    c1.destroy();
    c2.destroy();
    div2.remove();
  },

  "util-indicator-build-pane": async (lib) => {
    const { x, y } = lineData(80);
    const pane = await lib.buildIndicatorPaneFromPreset("rsi", x, y, {
      id: "rsi-test",
      period: 14,
      height: 0.25,
    });
    assert(pane.id === "rsi-test", "pane built");
    assert(pane.series?.length > 0, "pane series");
  },
};
