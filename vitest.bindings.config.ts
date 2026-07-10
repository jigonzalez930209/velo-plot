import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import vue from "@vitejs/plugin-vue";
import { vitestSvelte } from "./src/bindings/test-utils/vitestSveltePlugin";

export default defineConfig({
  plugins: [
    vue(),
    vitestSvelte(),
    solid({ include: ["src/solid/**/*.{ts,tsx}"] }),
  ],
  test: {
    name: "bindings",
    globals: true,
    environment: "happy-dom",
    pool: "forks",
    include: [
      "src/bindings/**/*.test.ts",
      "src/react/**/*.test.tsx",
      "src/vue/**/*.test.ts",
      "src/svelte/**/*.test.ts",
      "src/solid/**/*.test.tsx",
      "src/angular/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "json"],
      reportsDirectory: "coverage/bindings",
      all: false,
      include: [
        "src/bindings/**/*.ts",
        "src/react/**/*.{ts,tsx}",
        "src/vue/**/*.{ts,vue}",
        "src/svelte/**/*.{ts,svelte}",
        "src/solid/**/*.{ts,tsx}",
        "src/angular/**/*.{ts}",
      ],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      thresholds: {
        lines: 98,
        functions: 98,
        branches: 98,
        statements: 98,
        perFile: true,
      },
    },
  },
});
