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
      ],
      exclude: ["src/**/*.test.ts", "**/index.ts", "**/types.ts"],
      thresholds: {
        lines: 45,
      },
    },
  },
});
