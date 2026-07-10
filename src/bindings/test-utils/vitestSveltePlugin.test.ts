import { describe, it, expect } from "vitest";
import { vitestSvelte } from "./vitestSveltePlugin";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("vitestSvelte plugin", () => {
  it("compiles svelte files and ignores non-svelte paths", async () => {
    const plugin = vitestSvelte();
    expect(plugin.transform?.("export const x = 1;", "/file.ts")).toBeNull();

    const dir = mkdtempSync(join(tmpdir(), "svelte-plugin-"));
    const file = join(dir, "Comp.svelte");
    writeFileSync(
      file,
      `<script>export let name = 'a';</script><p>{name}</p>`,
    );
    const result = await plugin.transform?.("", file);
    expect(result?.code).toContain("svelte/internal/client");
  });
});
