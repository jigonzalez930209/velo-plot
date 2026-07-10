# ADR 002: Bundle entry split (core / trading / scientific / full)

**Status:** Accepted (v3.0.0 GA)  
**Date:** 2026-07-10  
**Stage:** [05-v3-stable-platform](../roadmap/05-v3-stable-platform.md) (tasks 5.1–5.5)  
**See also:** [ADR 004](/adr/004-core-bundle-slimming) (registry-based core slimming), [Bundle Architecture](/guide/bundle-architecture)

## Context

v1.x shipped a single `velo-plot` entry that pulled scientific, 3D, and trading code into one graph. Trading dashboards paid a size penalty for unused scientific plugins.

## Decision

Ship four primary library entry points:

| Entry | Path | Audience |
|-------|------|----------|
| Core | `velo-plot` | Line/scatter/step/band charts, plugins API, WebGL2 |
| Trading | `velo-plot/trading` | + candlestick, indicators, alerts, stacked, WebGPU |
| Scientific | `velo-plot/scientific` | + heatmap, bar, polar, analysis, 3D, LaTeX |
| Full | `velo-plot/full` | Everything (documented as heavy) |

Framework bindings remain separate (`velo-plot/react`, `velo-plot/vue`, …).

### Core slimming (v3.0.0+)

Extended series types register buffer + frame render handlers via `registerExtendedSeries()`, called automatically by `velo-plot/trading`, `velo-plot/scientific`, and `velo-plot/full`.

Trading-only chart APIs (`addIndicator`, `addAlert`, `setDrawingMode`, …) are patched onto `ChartImpl` by `velo-plot/trading` import side-effects.

WebGPU (`renderer: 'webgpu'`) and heatmap shaders compile only when an extended entry is imported.

Full technical detail: [ADR 004](/adr/004-core-bundle-slimming).

## Consequences

- **Positive:** Tree-shaking-friendly imports; CI gzip budgets per entry (`scripts/check-bundle-size.mjs`); actionable runtime errors when wrong entry is used.
- **Negative:** Users must pick the correct entry; migration guide required ([migration-v3](/guide/migration-v3)).
- **Measured (minified ESM gzip, 2026-07-10 post-slim):** core ~51 KB, trading ~72 KB, scientific ~114 KB (budgets 52 / 150 / 200 KB; stretch target core 40 KB).

## Alternatives considered

- Single entry with manual tree-shaking only — rejected; bundlers still pulled shared chunks unpredictably.
- More granular entries (per-plugin) — deferred; subpath plugins remain for advanced users (`velo-plot/plugins/*`).

## Documentation

- [Bundle Architecture](/guide/bundle-architecture) — canonical user guide
- [Core Bundle](/api/core-bundle) · [Trading](/api/trading-bundle) · [Scientific](/api/scientific-bundle) — API reference pages
- [Migration v2 → v3](/guide/migration-v3)
