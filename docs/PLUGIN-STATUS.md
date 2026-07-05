# Plugin Status Registry

> Last updated: 2026-07-05 (Stage 0 foundation audit)

Status key: **complete** = production-ready and tested | **partial** = usable with gaps | **stub** = documented but non-functional | **experimental** = opt-in, may change

| Plugin / Module | Status | Notes |
|-----------------|--------|-------|
| PluginAnalysis | complete | FFT, filters, indicators, peaks |
| PluginTools | complete | Delta, peak, tooltips |
| PluginAnnotations | complete | Lines, shapes, text |
| PluginStreaming | complete | WebSocket + backpressure |
| PluginSnapshot | complete | PNG/JPEG/WebP/SVG per chart; stack PNG via `stack.exportImage()` |
| PluginDataExport | complete | CSV, JSON, etc. |
| PluginContextMenu | complete | |
| PluginRegression | complete | 8 fitting methods |
| PluginAnomalyDetection | complete | |
| PluginPatternRecognition | partial | Built-in patterns OK; `custom` pattern returns errors |
| PluginForecasting | complete | `sma`, `ema`, `wma`, `linear`, `expSmoothing`, `holt`, `holtWinters` |
| PluginMLIntegration | partial | Simple native NN/regression only |
| PluginVirtualization | partial | line/scatter/step only — not candlestick/bar |
| PluginOffscreen | partial | Requires OffscreenCanvas support |
| PluginLazyLoad | partial | TODO: distance-based unloading |
| PluginCaching | partial | TODO: auto-invalidate on data change |
| PluginSync | **stub** | Deprecated — use `ChartGroup` |
| PluginGpu / WebGPU | experimental | Not production default |
| ChartGroup sync | complete | X/Y pan/zoom/cursor; selection sync (v1.13+) |
| createStackedChart | complete | Vertical + horizontal layout, stack export (v1.13+) |

See [Stage 0 roadmap](./roadmap/00-foundation-audit.md) for remediation tasks.
