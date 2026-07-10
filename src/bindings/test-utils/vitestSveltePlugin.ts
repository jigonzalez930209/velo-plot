import { readFileSync } from "node:fs";
import { compile } from "svelte/compiler";
import type { Plugin } from "vite";

export function vitestSvelte(): Plugin {
  return {
    name: "vitest-svelte",
    transform(_code, id) {
      if (!id.endsWith(".svelte")) return null;
      const source = readFileSync(id, "utf8");
      const compiled = compile(source, {
        filename: id,
        generate: "client",
        dev: true,
      });
      return {
        code: compiled.js.code,
        map: compiled.js.map,
      };
    },
  };
}
