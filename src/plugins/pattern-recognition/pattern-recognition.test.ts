import { describe, it, expect } from "vitest";
import { PluginPatternRecognition } from "./index";
import type { PatternPoint } from "./types";

function makePlugin() {
  return PluginPatternRecognition();
}

const points: PatternPoint[] = Array.from({ length: 20 }, (_, i) => ({
  x: i,
  y: 10 + i + (i % 2 === 0 ? 1 : -1),
}));

describe("PluginPatternRecognition custom registration (3.6)", () => {
  it("registers multiple named custom patterns without collision", () => {
    const plugin = makePlugin();
    const api: any = plugin.api;

    const alwaysValid = () => ({
      valid: true,
      confidence: 0.9,
      segments: [],
      keyPoints: points.slice(0, 3),
    });

    api.register("spike", { name: "Spike", minPoints: 3, maxPoints: 6, validator: alwaysValid });
    api.register("dip", { name: "Dip", minPoints: 3, maxPoints: 6, validator: alwaysValid });

    const ids = api.getRegisteredPatterns().map((p: any) => p.id);
    expect(ids).toContain("spike");
    expect(ids).toContain("dip");
  });

  it("detects registered custom patterns when 'custom' is requested", async () => {
    const plugin = makePlugin();
    const api: any = plugin.api;

    api.register("flat-run", {
      name: "Flat Run",
      minPoints: 3,
      maxPoints: 8,
      validator: (pts: PatternPoint[]) => ({
        valid: pts.length >= 3,
        confidence: 0.95,
        segments: [],
        keyPoints: pts,
      }),
    });

    const result = await api.detectPatterns("s1", points, {
      patternTypes: ["custom"],
      minConfidence: 0.5,
      sensitivity: 0,
      minPatternSize: 3,
      maxPatternSize: 8,
      overlapTolerance: 0.9,
    });

    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].pattern.id).toBe("flat-run");
  });

  it("unregisters a custom pattern", () => {
    const plugin = makePlugin();
    const api: any = plugin.api;
    api.register("temp", { name: "Temp", minPoints: 3, validator: () => ({ valid: false, confidence: 0, segments: [], keyPoints: [] }) });
    expect(api.getRegisteredPatterns().some((p: any) => p.id === "temp")).toBe(true);
    expect(api.unregister("temp")).toBe(true);
    expect(api.getRegisteredPatterns().some((p: any) => p.id === "temp")).toBe(false);
  });

  it("rejects registration without a validator", () => {
    const plugin = makePlugin();
    const api: any = plugin.api;
    api.register("bad", { name: "Bad" } as any);
    expect(api.getRegisteredPatterns().some((p: any) => p.id === "bad")).toBe(false);
  });
});
