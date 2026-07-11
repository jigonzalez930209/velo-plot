import { assert, hostEl, lineData, ohlcData } from "./data.mjs";

export const svgExportScenarios = {
  "svg-export-line": async (lib) => {
    const chart = lib.createChart({
      container: hostEl(),
      width: 720,
      height: 400,
      animations: false,
    });
    chart.addSeries({
      id: "line",
      type: "line",
      data: lineData(80),
      style: { color: "#ff0055", width: 2 },
    });
    chart.render();
    const svg = chart.exportSVG({ includeOverlays: true, includeLegend: true });
    assert(typeof svg === "string" && svg.includes("<svg"), "exportSVG returns svg");
    assert(svg.includes("<polyline"), "line path in svg");
    chart.destroy();
    return { svgLength: svg.length };
  },

  "svg-export-candlestick": async (lib) => {
    const chart = lib.createChart({
      container: hostEl(),
      width: 720,
      height: 400,
      animations: false,
    });
    chart.addSeries({
      id: "ohlc",
      type: "candlestick",
      data: ohlcData(40),
      style: { bullishColor: "#22c55e", bearishColor: "#ef4444" },
    });
    chart.render();
    const svg = chart.exportSVG();
    assert(svg.includes("<line") || svg.includes("<rect"), "candlestick vectors");
    chart.destroy();
    return { svgLength: svg.length };
  },

  "svg-export-replay-at": async (lib) => {
    const chart = lib.createChart({
      container: hostEl(),
      width: 640,
      height: 360,
      animations: false,
    });
    const data = lineData(50);
    chart.addSeries({ id: "l", type: "line", data });
    chart.render();
    const midX = data.x[Math.floor(data.x.length / 2)];
    const svg = chart.exportSVG({ at: midX });
    assert(svg.includes("<svg"), "replay-at svg");
    chart.destroy();
    return { at: midX, svgLength: svg.length };
  },

  "svg-snapshot-parity": async (lib) => {
    const chart = lib.createChart({
      container: hostEl(),
      width: 640,
      height: 360,
      animations: false,
    });
    chart.addSeries({ id: "l", type: "bar", data: lineData(30) });
    await chart.use(lib.PluginSnapshot());
    chart.render();
    const direct = chart.exportSVG({ includeOverlays: true });
    const viaPlugin = await chart.snapshot.takeSnapshot({ format: "svg", includeOverlays: true });
    assert(direct === viaPlugin, "snapshot svg matches exportSVG");
    chart.destroy();
    return { length: direct.length };
  },

  "stacked-export-svg": async (lib) => {
    const stack = lib.createStackedChart({
      container: hostEl(),
      panes: [
        { id: "a", height: 0.5, series: [{ id: "l1", type: "line", data: lineData(40) }] },
        { id: "b", height: 0.5, series: [{ id: "l2", type: "line", data: lineData(40) }] },
      ],
    });
    await stack.whenReady();
    const svg = stack.exportSVG({ includeDividers: true });
    assert(svg.includes("<svg") && svg.includes("<g transform"), "stack svg composite");
    const snap = stack.exportSVG({ includeDividers: true });
    assert(snap.includes("<svg"), "stack exportSVG repeat");
    stack.destroy();
    return { svgLength: svg.length };
  },

  "svg-visual-diff-line": async (lib) => {
    const chart = lib.createChart({
      container: hostEl(),
      width: 520,
      height: 320,
      animations: false,
    });
    chart.addSeries({
      id: "l",
      type: "bar",
      data: lineData(24),
      style: { color: "#3b82f6", barWidth: 10 },
    });
    chart.render();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const svg = chart.exportSVG({ includeOverlays: true });
    const raster = chart.exportImage("png");
    assert(raster.startsWith("data:image/png"), "canvas raster export");
    chart.destroy();
    return { svg, raster, width: 520, height: 320 };
  },

  "svg-live-renderer-overlay": async (lib) => {
    const container = hostEl();
    const chart = lib.createChart({
      container,
      width: 520,
      height: 320,
      animations: false,
      renderer: "svg",
    });
    chart.addSeries({
      id: "l",
      type: "line",
      data: lineData(40),
      style: { color: "#00f2ff", width: 2 },
    });
    chart.render();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const svgLayer = container.querySelector("svg.velo-plot-svg-layer");
    const overlay = [...container.querySelectorAll("canvas")].find(
      (c) => c.style.display !== "none",
    );
    assert(svgLayer != null, "svg layer present");
    assert(overlay != null && overlay.style.display !== "none", "overlay canvas visible in svg mode");
    assert((svgLayer.innerHTML || "").includes("polyline"), "svg series rendered");
    chart.destroy();
    return { ok: true };
  },

  "svg-mirror-smoke": async (lib) => {
    const container = hostEl();
    const chart = lib.createChart({
      container,
      width: 720,
      height: 400,
      animations: false,
      renderer: "svg",
    });
    chart.addSeries({ id: "line", type: "line", data: lineData(24), style: { color: "#3b82f6", width: 2 } });
    chart.addSeries({ id: "bar", type: "bar", data: lineData(12), style: { color: "#22c55e", barWidth: 8 } });
    chart.addSeries({ id: "ohlc", type: "candlestick", data: ohlcData(16) });
    chart.render();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const svgLayer = container.querySelector("svg.velo-plot-svg-layer");
    const html = svgLayer?.innerHTML || "";
    assert(svgLayer != null, "mirror smoke: svg layer");
    assert(html.includes("polyline") || html.includes("line"), "mirror smoke: line vectors");
    assert(html.includes("rect") || html.includes("line"), "mirror smoke: bar/candle vectors");
    const exported = chart.exportSVG({ includeOverlays: true });
    assert(exported.includes("<svg"), "mirror smoke: exportSVG parity");
    chart.destroy();
    return { seriesCount: 3, exportLength: exported.length };
  },
};
