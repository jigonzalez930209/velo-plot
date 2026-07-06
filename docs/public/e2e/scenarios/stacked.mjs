import { assert, hostEl, lineData, ohlcData } from "./data.mjs";

export const stackedScenarios = {
  "stacked-two-panes-sync": async (lib) => {
    const stack = lib.createStackedChart({
      container: hostEl(),
      masterPaneId: "price",
      panes: [
        {
          id: "price",
          height: 0.65,
          series: [{ id: "candles", type: "candlestick", data: ohlcData(50) }],
        },
        {
          id: "volume",
          height: 0.35,
          series: [{ id: "vol", type: "bar", data: lineData(50) }],
        },
      ],
    });
    await stack.whenReady();
    assert(stack.getPanes().length === 2, "two panes");
    stack.fitAll();
    stack.setSyncAxis("x");
    stack.resetAll();
    stack.destroy();
  },

  "stacked-add-pane": async (lib) => {
    const stack = lib.createStackedChart({
      container: hostEl(),
      panes: [{ id: "price", height: 0.7, series: [{ id: "l", type: "line", data: lineData() }] }],
    });
    await stack.whenReady();
    stack.addPane({
      id: "extra",
      height: 0.3,
      series: [{ id: "l2", type: "line", data: lineData(30) }],
    });
    assert(stack.getPanes().length === 2, "pane added");
    stack.destroy();
  },

  "stacked-addIndicator-rsi": async (lib) => {
    const stack = lib.createStackedChart({
      container: hostEl(),
      masterPaneId: "price",
      panes: [
        { id: "price", height: 0.7, series: [{ id: "candles", type: "candlestick", data: ohlcData(80) }] },
      ],
    });
    await stack.whenReady();
    const result = await stack.addIndicator("rsi", {
      pane: "new",
      id: "rsi-pane",
      period: 14,
      sourceSeriesId: "candles",
      paneHeight: 0.25,
    });
    assert(result.paneId === "rsi-pane", "rsi pane id");
    assert(stack.getPane("rsi-pane"), "rsi pane exists");
    stack.destroy();
  },

  "stacked-addIndicator-macd": async (lib) => {
    const stack = lib.createStackedChart({
      container: hostEl(),
      masterPaneId: "price",
      panes: [
        { id: "price", height: 0.7, series: [{ id: "candles", type: "candlestick", data: ohlcData(90) }] },
      ],
    });
    await stack.whenReady();
    await stack.addIndicator("macd", {
      pane: "new",
      id: "macd-pane",
      sourceSeriesId: "candles",
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    });
    assert(stack.getPane("macd-pane"), "macd pane");
    stack.destroy();
  },

  "stacked-addIndicator-bollinger": async (lib) => {
    const stack = lib.createStackedChart({
      container: hostEl(),
      masterPaneId: "price",
      panes: [
        { id: "price", height: 0.75, series: [{ id: "candles", type: "candlestick", data: ohlcData(70) }] },
      ],
    });
    await stack.whenReady();
    const result = await stack.addIndicator("bollinger", {
      sourceSeriesId: "candles",
      period: 20,
      stdDev: 2,
    });
    assert(result.placement === "overlay", "bollinger overlay");
    stack.destroy();
  },

  "stacked-addIndicator-ema": async (lib) => {
    const stack = lib.createStackedChart({
      container: hostEl(),
      masterPaneId: "price",
      panes: [
        { id: "price", height: 0.75, series: [{ id: "candles", type: "candlestick", data: ohlcData(60) }] },
      ],
    });
    await stack.whenReady();
    await stack.addIndicator("ema", { sourceSeriesId: "candles", period: 20, id: "ema20" });
    stack.destroy();
  },

  "stacked-addIndicator-sma": async (lib) => {
    const stack = lib.createStackedChart({
      container: hostEl(),
      masterPaneId: "price",
      panes: [
        { id: "price", height: 0.75, series: [{ id: "candles", type: "candlestick", data: ohlcData(60) }] },
      ],
    });
    await stack.whenReady();
    await stack.addIndicator("sma", { sourceSeriesId: "candles", period: 20, id: "sma20" });
    stack.destroy();
  },

  "stacked-export-image": async (lib) => {
    const stack = lib.createStackedChart({
      container: hostEl(),
      panes: [
        { id: "a", height: 0.5, series: [{ id: "l", type: "line", data: lineData() }] },
        { id: "b", height: 0.5, series: [{ id: "l2", type: "line", data: lineData() }] },
      ],
    });
    await stack.whenReady();
    const url = await stack.exportImage({ format: "png" });
    assert(typeof url === "string" && url.length > 100, "stack export");
    stack.destroy();
  },
};
