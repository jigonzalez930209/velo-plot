#!/usr/bin/env node
/**
 * Convert dynamic `await import('@src/...')` in VitePress demos to static imports.
 * Line-safe: never uses cross-line regex that can swallow unrelated `{ ... }` blocks.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const themeDir = join(dirname(fileURLToPath(import.meta.url)), "../docs/.vitepress/theme");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".vue")) out.push(p);
  }
  return out;
}

function parseImportSpec(spec) {
  spec = spec.trim();
  if (spec.startsWith("{")) {
    return {
      type: "named",
      names: spec
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
  }
  return { type: "namespace", name: spec };
}

function mergeImports(map, modulePath, spec) {
  const parsed = parseImportSpec(spec);
  if (!map.has(modulePath)) {
    map.set(modulePath, { named: new Set(), namespaces: new Set() });
  }
  const entry = map.get(modulePath);
  if (parsed.type === "named") {
    for (const n of parsed.names) entry.named.add(n);
  } else {
    entry.namespaces.add(parsed.name);
  }
}

function formatStaticImports(importMap) {
  const lines = [];
  for (const [modulePath, { named, namespaces }] of [...importMap.entries()].sort()) {
    if (named.size) {
      lines.push(`import { ${[...named].sort().join(", ")} } from '${modulePath}'`);
    }
    for (const ns of [...namespaces].sort()) {
      lines.push(`import * as ${ns} from '${modulePath}'`);
    }
  }
  return lines;
}

function tryParseDynamicImportLine(line) {
  const m = line.match(
    /^(?<indent>\s*)(?:const\s+)?(?<spec>\{[^}]+\}|\w+)\s*=\s*await\s+import\(['"](?<mod>@src\/[^'"]+)['"]\)\s*;?\s*$/,
  );
  if (!m?.groups) return null;
  return { indent: m.groups.indent, spec: m.groups.spec, modulePath: m.groups.mod };
}

function collectDynamicImports(lines) {
  const importMap = new Map();
  const skip = new Set();

  for (let i = 0; i < lines.length; i++) {
    const single = tryParseDynamicImportLine(lines[i]);
    if (single) {
      mergeImports(importMap, single.modulePath, single.spec);
      skip.add(i);
      continue;
    }

    // Multiline: const { ... } = await import('...') — brace depth must reach 0 on same closing line as import
    const open = lines[i].match(/^(\s*)const\s+\{/);
    if (!open) continue;

    let depth = (lines[i].match(/\{/g) ?? []).length - (lines[i].match(/\}/g) ?? []).length;
    if (depth <= 0) continue;

    let j = i + 1;
    while (j < lines.length && depth > 0) {
      depth += (lines[j].match(/\{/g) ?? []).length;
      depth -= (lines[j].match(/\}/g) ?? []).length;
      j++;
    }
    if (j > lines.length) continue;

    const closeLine = lines[j - 1];
    const closeMatch = closeLine.match(/\}\s*=\s*await\s+import\(['"](@src\/[^'"]+)['"]\)\s*;?\s*$/);
    if (!closeMatch) continue;

    const specLines = lines.slice(i, j);
    const specBody = specLines
      .join("\n")
      .replace(/^\s*const\s+/, "")
      .replace(/\}\s*=\s*await\s+import\(['"]@src\/[^'"]+['"]\)\s*;?\s*$/, "}")
      .trim();
    mergeImports(importMap, closeMatch[1], specBody);
    for (let k = i; k < j; k++) skip.add(k);
    i = j - 1;
  }

  return { importMap, skip };
}

function findImportInsertIndex(lines) {
  let scriptStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("<script setup")) {
      scriptStart = i;
      break;
    }
  }
  if (scriptStart < 0) return -1;

  let lastImport = scriptStart;
  for (let i = scriptStart + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith("</script>")) break;
    if (/^import\s.+from\s+['"]/.test(t)) lastImport = i;
    else if (t && !t.startsWith("//") && !t.startsWith("/*")) break;
  }
  return lastImport;
}

function transformVue(content) {
  if (!content.includes("await import('@src")) return null;

  const lines = content.split("\n");
  const { importMap, skip } = collectDynamicImports(lines);
  const staticImports = formatStaticImports(importMap);
  if (!staticImports.length) return null;

  const filtered = lines.filter((_, idx) => !skip.has(idx));
  const insertAt = findImportInsertIndex(filtered);
  if (insertAt < 0) return null;

  filtered.splice(insertAt + 1, 0, ...staticImports);
  return filtered.join("\n");
}

let updated = 0;
for (const file of walk(themeDir)) {
  const original = readFileSync(file, "utf8");
  const next = transformVue(original);
  if (next && next !== original) {
    writeFileSync(file, next);
    updated += 1;
    console.log(`  updated ${file.replace(themeDir + "/", "")}`);
  }
}
console.log(`[docs-static-imports] ${updated} files updated`);
