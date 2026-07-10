import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = resolve(__dirname, "../api/known-limitations.json");

let registry = { _default: [] };

try {
  registry = JSON.parse(readFileSync(registryPath, "utf8"));
} catch {
  // docs build without registry — skip injection
}

/**
 * Append a "## Known limitations" section to API pages that do not define one.
 */
export function knownLimitationsPlugin() {
  return (md) => {
    const defaultRender = md.render.bind(md);
    md.render = (src, env) => {
      const rel = env?.relativePath ?? env?.filePath ?? "";
      const normalized = rel.replace(/\\/g, "/");
      if (!normalized.startsWith("api/") || normalized.endsWith("known-limitations.json")) {
        return defaultRender(src, env);
      }
      if (src.includes("## Known limitations")) {
        return defaultRender(src, env);
      }

      const specific = registry[normalized] ?? [];
      const bullets = [...specific, ...(specific.length ? [] : registry._default ?? [])];
      if (!bullets.length) {
        return defaultRender(src, env);
      }

      const section = [
        "",
        "## Known limitations",
        "",
        ...bullets.map((b) => `- ${b}`),
        "",
      ].join("\n");

      return defaultRender(src + section, env);
    };
  };
}
