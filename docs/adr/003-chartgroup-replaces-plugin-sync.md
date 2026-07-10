# ADR 003: ChartGroup replaces PluginSync

**Status:** Accepted (v2.0+, deprecated removal v4.0)  
**Date:** 2026-07-10  
**Stage:** [02-trading-experience](../roadmap/02-trading-experience.md), [05-v3-stable-platform](../roadmap/05-v3-stable-platform.md)

## Context

`PluginSync` was a stub that logged warnings and performed no synchronization. Multi-chart apps used ad-hoc event wiring. `createStackedChart` and trading dashboards needed reliable X/Y pan, zoom, cursor, and selection sync.

## Decision

1. **`ChartGroup`** (`src/core/sync/`) is the supported sync API — bidirectional pan/zoom, cursor, optional selection sync, master/slave fit.
2. **`PluginSync`** is **experimental/deprecated** — documented in [PLUGIN-STATUS](../PLUGIN-STATUS.md); **removed in v4.0**.
3. Stacked charts use internal sync; standalone charts use `createChartGroup` / `linkCharts`.

## Consequences

- **Positive:** Honest API; sync behavior is tested (`src/core/sync/index.test.ts`).
- **Negative:** Breaking change for code that relied on the plugin name — migration guide covers `ChartGroup` migration.
- **Docs:** [Chart Sync API](../api/chart-sync.md) lists known limitations (deprecated plugin, selection id matching).

## Alternatives considered

- Implement sync inside `PluginSync` — rejected; core sync belongs in chart engine, not a no-op plugin facade.
