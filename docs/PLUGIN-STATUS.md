# Plugin Status Registry

> Last updated: 2026-07-10 (v3.0.0-rc.1 / Stage 5)

Status key:

| Status | Meaning |
|--------|---------|
| **complete** | Production-ready and tested |
| **partial** | Usable; documented gaps accepted for v3 |
| **experimental** | Opt-in; API may change; may be a stub or paused backend |
| **stub** | *(legacy)* Prefer **experimental** + deprecation note |

v3 release criterion: every plugin is **complete**, **partial** (with known gaps), or **experimental**. No undocumented stubs.

| Plugin / Module | Status | Notes |
|-----------------|--------|-------|
| PluginAnalysis | complete | FFT, filters, indicators, peaks |
| PluginTools | complete | Delta, peak, tooltips |
| PluginAnnotations | complete | Lines, shapes, text |
| PluginStreaming | complete | WebSocket + backpressure |
| PluginSnapshot | complete | PNG/JPEG/WebP/SVG per chart (**SVG partial** — see [Stage 6](./roadmap/06-svg-vector-parity.md)); stack PNG via `stack.exportImage()` |
| PluginDataExport | complete | CSV, JSON, etc. |
| PluginContextMenu | complete | |
| PluginRegression | complete | 8 fitting methods |
| PluginAnomalyDetection | complete | |
| PluginPatternRecognition | partial | Built-in patterns OK; `custom` pattern returns errors (accepted gap for v3) |
| PluginForecasting | complete | `sma`, `ema`, `wma`, `linear`, `expSmoothing`, `holt`, `holtWinters`, `arima`; unknown method strings throw |
| PluginMLIntegration | partial | Simple native NN/regression only (accepted gap for v3) |
| PluginVirtualization | complete | Viewport-aware LOD, worker offload, `precision: 'full'` |
| PluginOffscreen | partial | Requires OffscreenCanvas support (accepted gap for v3) |
| PluginLazyLoad | complete | Chunks, distance unload, `setDataWindow` |
| PluginCaching | complete | Auto-invalidate on data update |
| PluginSync | **experimental** | Deprecated stub — use `ChartGroup`. **Removed in v4.0** |
| PluginGpu / WebGPU | **experimental** | Opt-in `renderer: 'webgpu'`; WebGL2 remains default |
| PluginDrawingTools | complete | Trendline, fib, undo/redo |
| PluginReplay | complete | Bar-by-bar playback |
| ChartGroup sync | complete | X/Y pan/zoom/cursor; selection sync |
| createStackedChart | complete | Vertical + horizontal layout, stack export |

See [Stage 5 roadmap](./roadmap/05-v3-stable-platform.md) and [Migration v3](./guide/migration-v3.md).
