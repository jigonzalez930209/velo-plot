#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const name = process.argv[2];
if (!name) {
  console.error("Usage: velo-plot create-plugin <plugin-name>");
  process.exit(1);
}

const slug = name.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
const dir = resolve(process.cwd(), `plugins/${slug}`);

await mkdir(dir, { recursive: true });

await writeFile(
  resolve(dir, "index.ts"),
  `import type { ChartPlugin, PluginManifest } from "velo-plot";

const manifest: PluginManifest = {
  name: "velo-plot-${slug}",
  version: "1.0.0",
  description: "${slug} plugin for velo-plot",
  provides: ["interaction"],
  tags: ["${slug}"],
};

export function Plugin${slug
  .split("-")
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join("")}(): ChartPlugin {
  return {
    manifest,
    onInit() {},
    onDestroy() {},
  };
}

export default Plugin${slug
  .split("-")
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join("")};
`,
);

await writeFile(
  resolve(dir, "index.test.ts"),
  `import { describe, it, expect } from "vitest";
import Plugin from "./index";

describe("${slug} plugin", () => {
  it("exposes manifest", () => {
    const plugin = Plugin();
    expect(plugin.manifest.name).toBe("velo-plot-${slug}");
  });
});
`,
);

await writeFile(
  resolve(dir, "README.md"),
  `# velo-plot-${slug}

Scaffolded velo-plot plugin.

\`\`\`ts
import { Plugin${slug
  .split("-")
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join("")} } from "./index";

chart.loadPlugin(Plugin${slug
  .split("-")
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join("")}());
\`\`\`
`,
);

console.log(`Created plugin scaffold at ${dir}`);
