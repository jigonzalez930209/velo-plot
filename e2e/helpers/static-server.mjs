#!/usr/bin/env node
/**
 * Static server for E2E tests and browser benchmarks.
 * Serves docs/public/ + dist/velo-plot.full.js
 */
import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const publicDir = join(root, "docs/public");
const distDir = join(root, "dist");

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".map": "application/json",
};

export function resolveStaticFile(urlPath) {
  if (urlPath.startsWith("/dist/")) {
    const file = join(distDir, urlPath.slice("/dist/".length));
    return existsSync(file) ? file : null;
  }
  // Vite emits worker chunks at /assets/* relative to site root
  if (urlPath.startsWith("/assets/")) {
    const file = join(distDir, urlPath.slice(1));
    return existsSync(file) ? file : null;
  }
  const publicFile = join(publicDir, urlPath.replace(/^\//, ""));
  if (existsSync(publicFile)) return publicFile;
  return null;
}

export function startStaticServer(port = 9876) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent(
        new URL(req.url ?? "/", `http://127.0.0.1:${port}`).pathname,
      );
      const file = resolveStaticFile(urlPath);
      if (!file) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = extname(file);
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      createReadStream(file).pipe(res);
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 9876);
  if (!existsSync(join(distDir, "velo-plot.full.js"))) {
    console.error("[static-server] dist/velo-plot.full.js missing — run pnpm build first");
    process.exit(1);
  }
  await startStaticServer(port);
  console.log(`[static-server] http://127.0.0.1:${port}/e2e/harness.html`);
}
