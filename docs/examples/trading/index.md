---
title: Trading Examples (v2)
description: Interactive demos for Stage 2 Trading Experience — business-day scale, addIndicator, drawings, alerts, replay, and datafeed.
---

# Trading Experience (v2.0)

Interactive examples for professional trading dashboards. All demos use the [`velo-plot/trading`](/api/trading-bundle) bundle.

## Overview

<TradingDashboardDemo />

[Full dashboard walkthrough →](./dashboard)

## All examples

| Example | Feature | API |
|---------|---------|-----|
| [Dashboard](./dashboard) | Full multi-pane layout | [Trading bundle](/api/trading-bundle) |
| [Session scale](./session) | Business-day X axis | [Time scale](/api/trading-time-scale) |
| [Indicators](./indicators) | `addIndicator()` presets | [addIndicator](/api/trading-indicators) |
| [Drawing tools](./drawing-tools) | Trendline, Fibonacci, undo | [Drawing tools](/api/plugin-drawing-tools) |
| [Heikin-Ashi](./heikin-ashi) | Smoothed candlesticks | [Candlestick](/api/candlestick) |
| [Hollow candles](./hollow-candles) | Outline bullish bodies | [Candlestick](/api/candlestick) |
| [Markers & positions](./markers-positions) | Buy/sell + entry/SL/TP | [Alerts API](/api/trading-alerts) |
| [Price alerts](./alerts) | Cross events | [Alerts API](/api/trading-alerts) |
| [Bar replay](./replay) | Playback controls | [Replay](/api/plugin-replay) |
| [Mock datafeed](./datafeed) | Historical + live bars | [Datafeed](/api/datafeed) |

## Migration

Upgrading from v1.x? See the [Migration guide](/guide/migration-v2).

## Related

- [Candlestick charts](/examples/candlestick) — base OHLC series
- [Multi-pane stack](/examples/pane-stack) — sync presets and resize
- [Financial indicators (manual)](/examples/indicators) — low-level calculator API
