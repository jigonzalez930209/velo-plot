import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/core/sync/**/*.ts",
        "src/core/stacked/**/*.ts",
        "src/core/indicator/**/*.ts",
        "src/core/format/**/*.ts",
        "src/core/render/**/*.ts",
        "src/core/chart/NavigationUtils.ts",
        "src/core/chart/ChartScaling.ts",
        "src/core/chart/exporter/**/*.ts",
        "src/core/OverlayRenderer.ts",
        "src/core/stacked/createStackedChart.ts",
        "src/core/stacked/stackExport.ts",
        "src/core/series/SeriesBounds.ts",
        "src/scales/**/*.ts",
        "src/plugins/forecasting/algorithms.ts",
        "src/plugins/tools/tooltip/format.ts",
        // Stage 1 performance modules
        "src/workers/downsample.ts",
        "src/workers/downsampleAsync.ts",
        "src/workers/pool.ts",
        "src/workers/indicatorsAsync.ts",
        "src/workers/indicator.worker.ts",
        "src/plugins/virtualization/index.ts",
        "src/plugins/lazy-load/index.ts",
        "src/plugins/caching/index.ts",
        "src/renderer/spike/WebGLGridSpike.ts",
        // Stage 2 trading modules
        "src/core/chart/ChartAlerts.ts",
        "src/core/chart/heikinAshi.ts",
        "src/core/chart/candlestickMarkers.ts",
        "src/core/time/TimeScale.ts",
        "src/plugins/drawing-tools/index.ts",
        "src/plugins/replay/index.ts",
        "src/testing/stage1BrowserBench.ts",
      ],
      exclude: ["src/**/*.test.ts", "**/types.ts", "src/index.ts"],
      thresholds: {
        lines: 25,
      },
    },
  },
});
