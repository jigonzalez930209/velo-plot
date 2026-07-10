# Changelog

All notable changes to this project will be documented in this file.

## [3.0.0-rc.1] - 2026-07-10

### Breaking

- Prefer dedicated entry points: `velo-plot` (core), `velo-plot/trading`, `velo-plot/scientific`, `velo-plot/full`. Root/`full` remain available; trading and scientific apps should migrate imports.
- **`PluginSync`**: deprecated stub — use `ChartGroup` / `createChartGroup`. **Removal: v4.0**.
- **`chart.setPanMode(boolean)`**: use `chart.setMode('pan' | 'select')`. **Removal: v4.0**.
- **`chart.syncDragLayout()`**: prefer CSS pane transforms during resize. **Removal: v4.0**.
- Crosshair **`showAxisLabels`**: use `valueDisplayMode`. **Removal: v4.0**.
- Stacked **`getChart(id)`**: prefer `getPane(id)` (alias kept). **Removal: v4.0**.

### Deprecated (still work — aliases)

- React / framework: `SciPlot`, `SciChart`, `useSciPlot`, `useSciChart` → use `VeloPlot` / `useVeloPlot`.
- Angular: `SciPlotComponent`, `useSciPlotAngular` → `VeloPlotComponent` / `useVeloPlotAngular`.
- Svelte: `createSciPlot` → `createVeloPlot`.

### Added

- **`velo-plot/scientific`**: analysis, FFT, regression, forecasting, LaTeX, 3D, and related scientific plugins.
- [Migration guide v2 → v3](/docs/guide/migration-v3.md) and [What's new in v3](/docs/guide/whats-new-v3.md).
- Semantic versioning policy in `CONTRIBUTING.md`.
- CI runs `pnpm lint`; docs deploy also triggers on `v*` tags.

### Changed

- Package version **3.0.0-rc.1** (Stage 5 release candidate).
- Plugin status registry updated for v3 acceptance (experimental / documented partials).
- Landing page and README reflect v3 RC and bundle table.

## [2.0.0] - 2026-07-07

### Added — Trading Experience (Stage 2)

- **`velo-plot/trading` bundle**: Tree-shaken entry for trading dashboards (stacked charts, indicators, drawings, replay, datafeed).
- **Business-day time scale**: `xAxis.timeScale: { calendar: 'business-day' }` skips weekends; `mapToBusinessDayScale()` utility.
- **`chart.addIndicator()` / `stack.addIndicator()`**: High-level presets — RSI, MACD, Bollinger, EMA, SMA, Stochastic.
- **`PluginDrawingTools`**: Interactive trendline, horizontal, vertical, rectangle, Fibonacci retracement with undo/redo.
- **Trade markers**: `series.setMarkers()` on candlestick series (buy/sell arrows).
- **Position lines**: `chart.addPositionLine()` for entry, SL, TP levels.
- **Price alerts**: `chart.addAlert()`, `chart.on('alert', ...)`, visual alert lines.
- **`PluginReplay`**: Bar-by-bar playback with play/pause/step/seek.
- **Heikin-Ashi**: `type: 'heikin-ashi'` series and `computeHeikinAshi()` helper.
- **Hollow candles**: `style.hollow: true` on candlestick series.
- **`DatafeedAdapter`**: UDF-inspired contract with `createMockDatafeed()` and `barsToOhlc()`.

### Documentation

- [Migration v1 → v2](/docs/guide/migration-v2.md)
- Trading API reference: bundle, time scale, indicators, alerts, drawing tools, replay, datafeed
- Examples for every Stage 2 feature (dashboard, session scale, indicators, drawings, heikin-ashi, hollow, markers, alerts, replay, datafeed)
- 168 Playwright E2E scenarios across Chromium, Firefox, WebKit

### Changed

- Vitest coverage thresholds: 90% lines/statements, 88% functions, 75% branches (Stage 1+2 modules included).

## [1.16.0] - Unreleased

### Added
- **Viewport-aware virtualization**: slices visible x-range before LOD; debounced pan/zoom refresh; fixes original-data cache corruption on re-downsample.
- **Async downsampling pool**: `downsampleAsync`, `ohlcDownsampleAsync` for large series off main thread.
- **Canvas grid batching**: major/minor grid lines drawn with batched `stroke()` calls (fewer Canvas2D state changes).
- **`PluginVirtualization` `precision: 'full'`**: Opt out of LOD downsampling for fidelity-critical views.
- **`chart.getActiveRenderer()`**: Returns the runtime chart backend (`'webgl'` until WebGPU ships).
- **Async indicators**: `rsiAsync`, `smaAsync`, `emaAsync`, `macdAsync`, `bollingerBandsAsync` via shared worker pool.
- **Benchmark suite**: CPU tests (`stage1-perf.test.ts`), browser FPS demo, 5-pane stack resize scenario, regression compare script.
- **WebGL grid spike**: `compareGridBackends()` for axis/grid backend evaluation (defer Canvas2D migration).

### Changed
- **`renderer: 'webgpu'`**: Opt-in chart WebGPU via `GpuChartRenderer`; automatic WebGL2 fallback when unavailable.
- **Vitest coverage**: Stage 1 modules included; line threshold lowered to 25% for expanded scope.

### Documentation
- [Large Datasets Guide](/guide/large-datasets), [Async Indicators API](/api/indicators-async), renderer section in [createChart](/api/chart).

## [1.13.0] - Unreleased

### Added
- **Stack export**: `stack.exportImage()` / `stack.snapshot()` composes all panes at exact layout positions (PNG/JPEG/WebP, up to 8K).
- **SVG export**: `chart.exportSVG()` and `chart.snapshot.takeSnapshot({ format: 'svg' })` with vector series paths and tick labels.
- **Horizontal stack layout**: `direction: 'horizontal'` with `sharedYAxis: 'left'`, vertical dividers, and Y-axis sync default.
- **CI workflow**: Tests + build on every PR/push to `main`.
- **`velo-plot/react` export**: Dedicated entry point for React hooks and components.
- **Plugin status registry**: [docs/PLUGIN-STATUS.md](/PLUGIN-STATUS.md).

### Improved
- **`ChartGroup.syncSelection`**: Selection now propagates across linked charts when enabled.
- **HiDPI alignment**: WebGL and overlay canvases use matching rounded backing-store sizes.
- **Axis rendering**: Pixel-snapped grid lines and tick labels for sharper overlay text.
- **Build exports**: All `package.json` subpaths now have Vite entry points.

### Deprecated
- **`PluginSync`**: Use `ChartGroup` / `createChartGroup` instead.

## [1.12.0] - Unreleased

### Added
- **`createStackedChart`**: Native multi-pane vertical stacks (1–5 charts) with aligned margins, shared bottom X axis, master-slave sync, and mixed series types per pane.
- **`useStackedPlot`**: React hook for stacked pane layouts.
- **`chart.fit()`**: Safe fit API that skips empty series (no ±1e-5 bounds corruption).
- **`chart.getId()`**: Stable chart identifier for sync groups.
- **`ChartGroup.fitAll()`**, **`ChartGroup.batch()`**: Coordinated fit and sync suppression.

### Improved
- **`ChartGroup` pan sync**: Slaves receive master view bounds instead of raw pixel deltas.
- **`resetZoom()`**: Delegates to `fit()` instead of unconditional `autoScale()`.
- **HiDPI rendering**: Integer canvas backing-store pixels, `setTransform` DPR scaling, DPR refresh on resize, high-quality overlay text.

### Documentation
- New [Stacked Pane API](/api/stacked-chart), [Multi-Pane Guide](/guide/multi-pane), [Pane Stack Example](/examples/pane-stack).
- Updated [Chart Sync](/api/chart-sync), [createChart](/api/chart), and [React Hooks](/api/react-hook) docs.

## [1.11.0]

### Added
- **Help Search**: Local VitePress search enabled in the docs site so the help behaves like a searchable reference.
- **Inverted Axis Coverage**: New inverted-axis documentation and examples for IR-style chart presentation.

### Improved
- **Axis Spacing**: Refined axis label spacing defaults and layout handling for clearer title placement.
- **Docs Navbar Layout**: Search was moved into the header gap and the docs navbar layout was tightened to match the intended placement.

### Fixed
- **Docs Search Overlay**: Resolved search panel clipping and stacking issues in the documentation navbar by correcting the local search overlay z-index and wrapper sizing.

## [1.10.0] - 2026-01-17

### Added
- **PluginForecasting**: Native time-series prediction suite featuring Holt-Winters (Triple Exponential Smoothing), Holt (Double), Linear Trend, and Moving Averages.
- **Improved Forecasting Visuals**: Automatic rendering of forecast projections with dashed lines and shaded confidence intervals.
- **Seasonal Analysis**: Built-in support for modeling periodic cycles in data for more accurate long-term predictions.

### Improved
- **Roadmap Phase 4**: Commenced the 'New Generation' phase with advanced analytical capabilities.

## [1.9.0] - 2026-01-16

### Added
- **PluginOffscreen**: High-performance multi-threaded rendering using Worker Pool and OffscreenCanvas.
- **PluginVirtualization**: Modern data virtualization for 1M+ points using LTTB and Min-Max downsampling.
- **PluginROI**: Region of Interest selection tools (Lasso, Circle, Polygon, Rectangle) with data masking capabilities.
- **PluginBrokenAxis**: Specialized axis rendering for datasets with significant gaps.
- **PluginSnapshot**: Professional high-resolution image export (up to 8K) with custom watermarks.
- **Unified Plugin Discovery**: Direct API access on the chart instance (e.g., `chart.snapshot`, `chart.dataExport`, `chart.roi`, `chart.videoRecorder`).
- **Plugin Discovery API**: New `chart.getPluginNames()` method to introspect loaded plugins.

### Improved
- **Interaction Engine**: Robust `onInteraction` hook allowing plugins to capture, transform, or block native gestures.
- **Automatic Framing**: Improved `autoScale` logic for animated series and dynamically generated data in demos.
- **TypeScript Experience**: Complete `Chart` interface with all plugin properties for full IntelliSense support.
- **Data Integrity**: New `invalidateBuffers()` method on Series to force cached data refreshes.

### Fixed
- Initialization crash in `PluginSnapshot` when attempting to overwrite read-only getters.
- Interaction blocking bug in `PluginDragEdit` during point manipulation.
- Rendering inconsistencies in the 2D Overlay for polygon and lasso tools.
- Visibility issues in `ChartImpl` for the `events` property.

## [1.8.1] - 2026-01-16

### Added
- **PluginLaTeX**: Integrated LaTeX rendering for chart labels, titles, and annotations using a compressed math engine.
- **Ternary Charts**: Support for three-variable data visualization (A+B+C=100%) with ternary coordinate helpers.

## [1.8.0] - 2026-01-14

### Added
- **Sankey Diagrams**: Specialized high-performance renderer for visualizing flows, energy distribution, and process monitoring.
- **Gauge Charts**: Support for linear and radial needle-based gauges with customizable ranges and bands.
- **Data Transform Plugin**: Real-time signal processing pipeline support for Detrending, Baseline Correction, and Calibration.
- **PluginML**: Initial machine learning integration suite for time-series forecasting and classification.
- **PluginRadar**: Multi-variable radar/spider charts for comparative analysis.

## [1.7.2] - 2026-01-14

### Improved
- **Polar Grids**: Enhanced grid generation with support for angular subdivisions and radial scaling.

## [1.7.1] - 2026-01-14

### Added
- **Anomaly Detection Plugin**: Real-time outlier detection using Z-score, IQR, and adaptive thresholding.

## [1.7.0] - 2026-01-14

### Added
- **Polar Chart Core**: Native high-performance polar coordinate system with support for standard scientific series.

## [1.6.0] - 2026-01-12

### Added
- **Directional Indicators**: Real-time trend arrows and direction highlights for cyclic data (e.g., Cyclic Voltammetry).
- **Serialization API**: New hooks for plugins to participate in chart state save/load cycles.

## [1.5.3] - 2026-01-12

### Fixed
- **Streaming Axis Switching**: Resolved visual jump/flicker when switching axes during high-frequency data updates.

## [1.5.1] - 2026-01-10

### Added
- **Default Loading Chart**: Improved UX with a built-in loading state during initial rendering.
- **Selection through Legend**: Ability to highlight and select series directly from the legend items.
- **Favicon Support**: Custom favicon for documentation and web applications.

### Improved
- **Visualization**: Enhanced overall chart rendering quality and series visibility.
- **Usability**: Refined legend and settings button interactions for better accessibility.

### Fixed
- Resolved minor bugs and UI inconsistencies across the library.

## [1.4.0] - 2026-01-09

### Added
- **Plugin System Architecture**: Completely new modular plugin-based core allowing for better extensibility and tree-shaking.
- **Integral and Measurement Tools**: New plugins for precise data analysis and interactive measurements on the chart.
- **Background Customization**: Support for dynamic background colors and enhanced styling options.

### Changed
- **Modular Refactor**: Migrated core functionalities to dedicated plugins (Analysis, Tools, Annotations, etc.).
- **Import Structure**: Updated export paths to support scoped plugin imports.

## [1.3.0] - 2026-01-08

### Added
- **Theme Editor Plugin**: Interactive tool for real-time chart theme customization.
- **Financial Indicators**: Support for specialized scientific and financial data visualization.
- **Streaming Backpressure**: Robust handling of high-frequency data streams to ensure UI responsiveness.
- **Internationalization (i18n)**: Support for multiple languages in UI components.
- **Hotkeys and Shortcuts**: Enhanced keyboard navigation and chart control.
- **Debug Mode**: Built-in developer tools for performance monitoring and troubleshooting.

## [1.2.0] - 2026-01-08

### Added
- **Sequential Chart Rendering**: Implementation of a Queue system for smoother data updates and rendering performance.
- **FFT Complex Analyzer**: New utility for complex Fast Fourier Transform analysis of scientific data.

### Fixed
- **Tooltip Performance**: Resolved lag issues during tooltip rendering on large datasets.

## [0.4.2] - 2026-01-02

### Added
- **10M Points Challenge**: Specialized demo showcasing extreme performance capabilities (30 million points support).

### Improved
- **Rendering Performance**: Optimized data processing pipelines for high-density datasets.

## [0.4.0] - 2026-01-02

### Added
- **Comprehensive Tooltip System**: New tooltip module featuring customizable templates, smart positioning, and multi-series support.

### Changed
- **Package Renaming**: Transitioned to `@jigonzalez930209/velo-plot` for better package management.

## [0.3.0] - 2026-01-01

### Added
- **New Series Types**: Support for Candlestick and Stacked series.
- **WebSocket Streaming**: Native support for real-time data streaming over WebSockets.
- **Plugin Manager**: Initial introduction of the internal plugin management system.

### Changed
- **Native WebGL Refactor**: Significant performance improvements to the core WebGL renderer.

## [0.2.0] - 2025-12-31

### Added
- **Band Series Support**: New `band` series type for rendering filled areas between two curves (high-performance `TRIANGLE_STRIP` rendering).
- **Area Charts**: New `area` series type for solid fills from a curve to the baseline (y=0).
- **Statistics Panel**: Built-in collapsible overlay showing real-time Min, Max, Mean, Count, and Integrated Area for visible data.
- **Peak Analysis**:
  - Interactive example showing baseline subtraction, peak integration, and automatic peak labeling.
  - New analysis utilities for numerical integration and background correction.
- **Annotation System**: Complete support for Horizontal/Vertical lines, Rectangles, Bands, Text, and Arrows.
- **Step Charts**: New series types `step` and `step+scatter` with `before`, `after`, and `center` modes.
- **Data Export**: Export chart data to CSV and JSON formats with customizable precision.
- **Error Bars**: Support for symmetric/asymmetric Y error bars and horizontal X error bars.
- **Scatter Symbols**: 8 high-performance shapes (circle, square, diamond, triangle, etc.) using GPU-accelerated SDF rendering.
- **Enhanced Multi-Axis**: Independent scroll-zoom per axis, automatic stacking, and right-hand axis support.

### Changed
- **Modular Architecture (The Great Refactor)**: Rebuilt `Chart.ts` from a monolith into 8 specialized, maintainable modules (<250 LOC each).
- **Enhanced Data Analysis**: Improved `fitData` utility with better numerical stability for high-order polynomials.
- **Real-time Rolling Windows**: Improved `appendData` with circular buffer logic and selectable window sizes in demos.

### Fixed
- **Empty Legend Regression**: Resolved issue where legend didn't sync after series additions.
- **Secondary Axis Wheel Zoom**: Corrected hit-testing for right-positioned Y-axes.
- **Theme Transitions**: Improved resizing logic during dynamic theme switching.
- **Documentation**: Fixed asset paths and deployment URLs for GitHub Pages.

## [0.1.1] - 2025-12-30

### Fixed
- Documentation URL updates

## [0.1.0] - 2025-12-30

### Added
- Initial standalone release of velo-plot.
- WebGL specialized renderer for scientific data.
- React components and hooks support.
- Support for Panning and Box Zoom.
- Axis-specific zooming capabilities.
- Documentation site base with VitePress.
- CI/CD workflows for NPM and GitHub Pages.
