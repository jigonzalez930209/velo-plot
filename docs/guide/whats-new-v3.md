# What's new in v3

velo-plot **v3.0** is the stable-platform release: trading workflows, scientific depth, and first-class framework DX on one engine — with clear bundles and a migration path from v2.

## Highlights

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

- CI: unit + bindings + Playwright e2e + warning benchmarks
- Coverage gates on core Stage 1–4 modules
- Honest [plugin status](/PLUGIN-STATUS); SVG full homolog deferred to [Stage 6](/roadmap/06-svg-vector-parity) → v4

## Upgrade

- [Migration v2 → v3](/guide/migration-v3)
- [Migration v1 → v2](/guide/migration-v2) (if still on v1)
- [Installation](/guide/installation) — bundle table

## Release candidates

| Version | Notes |
|---------|--------|
| `3.0.0-rc.1` | First RC — scientific bundle, migration docs, semver policy, CI lint |
| `3.0.0` | GA — after RC feedback; npm `latest` |

Report issues against the RC before GA so breaking-change notes stay accurate.
