# Plugin Status Registry

> Last updated: 2026-07-10 (Stage 6 SVG parity)

Status key:

| Status | Meaning |
|--------|---------|
| **complete** | Production-ready and tested |
| **partial** | Usable; documented gaps accepted for v3 |
| **experimental** | Opt-in; API may change; may be a stub or paused backend |
| **stub** | *(legacy)* Prefer **experimental** + deprecation note |

v3 release criterion: every plugin is **complete**, **partial** (with known gaps), or **experimental**. No undocumented stubs.

| Plugin / Module | Status | SVG | Notes |
|-----------------|--------|-----|-------|
| PluginAnalysis | complete | partial | FFT, filters, indicators, peaks |
| PluginTools | complete | interactive | Delta, peak, tooltips (omit in export) |
| PluginAnnotations | complete | **complete** | Lines, shapes, text → vector SVG |
| PluginStreaming | complete | n/a | WebSocket + backpressure |
| PluginSnapshot | complete | **complete** | PNG/JPEG/WebP/SVG per chart; stack SVG via `stack.exportSVG()` |
| PluginDataExport | complete | n/a | CSV, JSON, etc. |
| PluginContextMenu | complete | n/a | |
| PluginRegression | complete | **complete** | Fit line + equation via chart series/annotations |
| PluginAnomalyDetection | complete | n/a | |
| PluginPatternRecognition | partial | **complete** | Pattern lines/labels via chart series + annotations |
| PluginForecasting | complete | **complete** | Forecast line + CI band via `onExportSVG` |
| PluginMLIntegration | partial | **complete** | Prediction line + band via `onExportSVG` |
| PluginVirtualization | complete | n/a | Viewport-aware LOD |
| PluginOffscreen | partial | n/a | Requires OffscreenCanvas |
| PluginLazyLoad | complete | n/a | Chunks, distance unload |
| PluginCaching | complete | n/a | Auto-invalidate on data update |
| PluginSync | **experimental** | n/a | Deprecated stub — use `ChartGroup`. **Removed in v4.0** |
| PluginGpu / WebGPU | **experimental** | n/a | Opt-in `renderer: 'webgpu'` |
| PluginDrawingTools | complete | **complete** | Committed drawings via `chart.getAnnotations()` |
| PluginReplay | complete | **complete** | `exportSVG({ at })` truncates series window |
| PluginLaTeX | complete | partial | foreignObject phase 1 (axis labels) |
| PluginBrokenAxis | complete | **complete** | Break markers via `onExportSVG` |
| PluginRadar | complete | **complete** | Spider chart grid + polygons |
| ChartGroup sync | complete | n/a | X/Y pan/zoom/cursor |
| createStackedChart | complete | **complete** | Vertical + horizontal; `stack.exportSVG()` |
| SeriesType SVG | complete | **complete** | All 18 types — see [svg-parity.json](/svg-parity.json) |
| 3D plugin | experimental | **deferred** | WebGL-only; SVG projection future work |

See [Stage 5 roadmap](./roadmap/05-v3-stable-platform.md) and [Migration v3](./guide/migration-v3.md).
