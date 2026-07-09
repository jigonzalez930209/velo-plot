import { cp, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function copyDir(name) {
  const src = resolve(root, `src/${name}`);
  const dest = resolve(root, `dist/${name}`);
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true });
  console.log(`Copied ${name} to dist/${name}`);
}

await copyDir("astro");
await copyDir("svelte");
