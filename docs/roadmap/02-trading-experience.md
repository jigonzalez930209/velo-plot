# Stage 2: Trading Experience

> **Target versions:** v2.0.0 → v2.1.0  
> **Prerequisite:** Stage 0 complete; Stage 1 candlestick virtualization recommended  
> **Parallel with:** [03-scientific-depth.md](./03-scientific-depth.md)

---

## Goal

Bring velo-plot to **professional trading dashboard** parity with libraries like lightweight-charts and TradingView — without sacrificing the scientific core. Users building apps like portfolio-fall should get a first-class trading API out of the box.

**v2.0.0** is expected to include breaking API additions (new time scale, high-level indicator API).

---

## Current state

### What exists (v1.12.0)

| Feature | Status | Location |
|---------|--------|----------|
| Candlestick OHLC | ✅ | `CandlestickRenderer`, `type: 'candlestick'` |
| Volume bars | ✅ | `type: 'bar'` with Y pinned to 0 (`NavigationUtils.ts`) |
| Multi-pane stacked layout | ✅ | `createStackedChart.ts` (max 5 panes) |
| X-axis sync between panes | ✅ | `ChartGroup` in `src/core/sync/index.ts` |
| Crosshair sync | ✅ | `setExternalCursor()` |
| Time axis **formatting** | ✅ | `xAxis.type: 'time'` (epoch ms) — **not** market calendar |
| 19 indicator calculators | ✅ | `src/plugins/analysis/indicators.ts` |
| Composite indicator panes | ✅ | `buildIndicatorPane`, `colorZones` on lines |
| Tooltips | ✅ | `TooltipManager` with time-aware format |
| Streaming / realtime | ✅ | `src/streaming/` + backpressure |
| Pattern recognition (partial) | ⚠️ | Built-in patterns only; custom throws |

### What is missing vs TradingView / lightweight-charts

| Feature | Gap |
|---------|-----|
| Business-day / session time scale | Weekends and market hours not skipped on X axis |
| High-level indicators (`chart.addRSI(14)`) | Manual calculate + `buildIndicatorPane` required |
| Interactive drawing tools | Annotations are programmatic only |
| Trade markers on price chart | Markers exist on indicators, not native buy/sell on candles |
| Replay / bar simulation | Not implemented |
| Price alerts | Not implemented |
| Heikin-Ashi, Renko, Kagi | Not implemented |
| Hollow candles, baseline chart | Not implemented |
| Symbol comparison / % scale | Not implemented |
| Datafeed API (UDF-style) | Not implemented |
| `syncSelection` | Stub in ChartGroup (fixed in Stage 0) |

---

## Work items

### P0 — Market time scale

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 2.1 | `TimeScale` module | P0 | Very High | New `src/core/time/TimeScale.ts` with business-day gaps, session hours, timezone |
| 2.2 | Integrate TimeScale with axis formatting | P0 | High | `xAxis.timeScale: { type: 'business-day', session: 'NYSE', timezone: 'America/New_York' }` |
| 2.3 | Candlestick index → timestamp mapping | P0 | Medium | OHLC data can use logical index or timestamp; gaps render correctly |
| 2.4 | Docs + example: trading session chart | P0 | Low | `docs/examples/trading/session.md` |

### P0 — High-level indicator API

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 2.5 | `chart.addIndicator()` facade | P0 | High | `chart.addIndicator('rsi', { period: 14, pane: 'new' })` calculates + renders |
| 2.6 | Presets: RSI, MACD, Bollinger, EMA, SMA, Stochastic | P0 | High | One-liner per indicator; uses worker path from Stage 1 |
| 2.7 | Stacked chart integration | P0 | Medium | `stack.addIndicator('macd')` appends pane via `buildIndicatorPane` |
| 2.8 | Update portfolio-fall integration guide | P1 | Low | Example in docs |

### P0 — Drawing tools

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 2.9 | `PluginDrawingTools` | P0 | Very High | Interactive trendline, horizontal line, vertical line, rectangle |
| 2.10 | Fibonacci retracement | P1 | High | Drag two points → fib levels drawn |
| 2.11 | Undo / redo stack | P0 | Medium | Ctrl+Z / Ctrl+Y for drawings; integrates with `PluginKeyboard` |
| 2.12 | Persist drawings in chart state | P1 | Medium | Serialize/deserialize via existing `src/serialization/` |
| 2.13 | Drawing mode toolbar API | P1 | Medium | `chart.setDrawingMode('trendline')` |

### P1 — Trade visualization

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 2.14 | Trade markers on candlestick series | P1 | Medium | `series.markers: [{ time, position: 'belowBar', shape: 'arrowUp', text: 'Buy' }]` |
| 2.15 | Position lines (entry, SL, TP) | P1 | Medium | Horizontal price lines with labels |
| 2.16 | Order flow markers from stream | P2 | High | Integration with `PluginStreaming` |

### P1 — Replay and alerts

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 2.17 | `PluginReplay` | P1 | High | Bar-by-bar playback with speed control |
| 2.18 | `chart.on('alert', ...)` price alerts | P1 | Medium | Crosses above/below price triggers event |
| 2.19 | Alert lines on chart | P2 | Low | Visual horizontal alert level |

### P1 — Additional chart types

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 2.20 | Heikin-Ashi series type | P1 | Medium | `type: 'heikin-ashi'` derived from OHLC |
| 2.21 | Hollow candlestick style option | P1 | Low | `style.hollow: true` on candlestick |
| 2.22 | Baseline / area-baseline chart | P2 | Medium | `type: 'baseline'` with configurable base value |
| 2.23 | Renko / Kagi (stretch) | P3 | Very High | Evaluate demand; defer to v2.2+ if needed |

### P2 — Datafeed contract

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 2.24 | `DatafeedAdapter` interface | P2 | High | UDF-inspired: `getBars`, `subscribeBars`, `resolveSymbol` |
| 2.25 | Mock datafeed example | P2 | Low | Demo page with historical + realtime mock |

---

## API sketch (v2.0)

```typescript
import { createStackedChart } from 'velo-plot/trading'

const stack = createStackedChart({
  container,
  panes: [
    { id: 'price', series: [{ type: 'candlestick', data: ohlc }] },
    { id: 'volume', series: [{ type: 'bar', data: volume }] },
  ],
  xAxis: {
    type: 'time',
    timeScale: { calendar: 'business-day', session: '24x7' },
  },
})

stack.addIndicator('rsi', { period: 14 })
stack.addIndicator('macd', { fast: 12, slow: 26, signal: 9 })

stack.getChart('price').setDrawingMode('trendline')
stack.getChart('price').on('alert', (e) => console.log(e))
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| TimeScale complexity (holidays, DST) | Ship with 2–3 built-in sessions; custom holiday calendar as config |
| Drawing tools scope creep | MVP: trendline + horizontal + undo; fib in v2.1 |
| Breaking changes in v2.0 | Migration guide from manual indicator setup to `addIndicator()` |
| Trading bundle size | Tree-shake scientific/3D out of `velo-plot/trading` entry |

---

## Exit checklist (v2.0.0)

- [x] Business-day time scale with at least one market session preset
- [x] `addIndicator()` for RSI, MACD, Bollinger, EMA, SMA, Stochastic
- [x] Drawing tools: trendline, horizontal, rectangle, fibonacci + undo/redo
- [x] Trade markers on candlestick series
- [x] Replay plugin MVP (play/pause/step)
- [x] Price alert events
- [x] Heikin-Ashi and hollow candles
- [x] Trading example app in docs (price + volume + RSI + MACD)
- [x] `velo-plot/trading` bundle exported and documented
- [x] Migration guide v1.x → v2.0 published
- [x] Dedicated API + example page per Stage 2 feature
