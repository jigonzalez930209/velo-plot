# What's new in v3

velo-plot **v3.0** is the stable-platform release: trading workflows, scientific depth, and first-class framework DX on one engine — with **documented bundles** and a clear migration path from v2.

## Highlights

### Bundle architecture (new in v3.0)

velo-plot is no longer a single monolithic import. Four primary entries keep apps small:

| Entry | Gzip | Doc |
|-------|------|-----|
| `velo-plot` | ~51 KB | [Core Bundle](/api/core-bundle) |
| `velo-plot/trading` | ~72 KB | [Trading Bundle](/api/trading-bundle) |
| `velo-plot/scientific` | ~114 KB | [Scientific Bundle](/api/scientific-bundle) |
| `velo-plot/full` | heavier | Everything |

Read the full guide: **[Bundle Architecture](/guide/bundle-architecture)**.

Core slimming uses **registry pattern** — extended series and trading APIs register at import time instead of living inside `ChartCore` ([ADR 004](/adr/004-core-bundle-slimming)).

### Trading

- `velo-plot/trading` — stacked charts, business-day time scale, `addIndicator()`, drawing tools (undo/redo), replay, price alerts, Heikin-Ashi, hollow candles, markers, datafeed helpers
- Live feed modes: fixed time window (auto-scroll) or expanding X domain
- End-to-end examples under [Trading](/examples/trading/)

### Scientific

- `velo-plot/scientific` — analysis / FFT, regression, forecasting, LaTeX, 3D, anomaly detection, pattern recognition, broken axis, virtualization
- Async workers for downsampling and indicators on large series
- Guides: [Scientific analysis](/guide/analysis), [Large datasets](/guide/large-datasets)

### React & frameworks

- Declarative `<StackedPlot />` / `<VeloPlot />` with reactive hooks
- `useIndicator`, `useChartSync`, keyboard nav, pinch-zoom, high-contrast theme
- Bindings: React, Vue, Svelte, Solid, Angular, Astro (`velo-plot/react`, …)

### Platform

- CI: unit + bindings + Playwright e2e + **bundle size budgets**
- ESLint clean; coverage gates on core modules
- Honest [plugin status](/PLUGIN-STATUS); SVG full homolog deferred to [Stage 6](/roadmap/06-svg-vector-parity) → v4

## Upgrade

- **[Bundle Architecture](/guide/bundle-architecture)** — start here
- [Migration v2 → v3](/guide/migration-v3)
- [Migration v1 → v2](/guide/migration-v2) (if still on v1)
- [Installation](/guide/installation) — import table

## Release

| Version | Notes |
|---------|--------|
| `3.0.0` | GA — bundle split, core slimming, migration docs, CI bundle budgets |

Report issues before upgrading production apps so breaking-change notes stay accurate.
