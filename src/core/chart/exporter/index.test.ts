import { describe, it, expect } from "vitest";

describe("chart exporter barrel exports", () => {
  it("re-exports SVGExporter", async () => {
    const mod = await import("./index");
    expect(mod.exportToSVG).toBeTypeOf("function");
  });
});
