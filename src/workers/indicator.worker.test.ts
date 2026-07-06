import { describe, it, expect, vi, beforeEach } from "vitest";

describe("indicator.worker", () => {
  const messages: unknown[] = [];

  beforeEach(async () => {
    messages.length = 0;
    vi.stubGlobal("self", globalThis);
    vi.stubGlobal("postMessage", (msg: unknown) => {
      messages.push(msg);
    });
    vi.resetModules();
    await import("./indicator.worker");
  });

  function dispatch(payload: Record<string, unknown>) {
    const handler = (globalThis as unknown as { onmessage?: (ev: MessageEvent) => void }).onmessage;
    if (!handler) throw new Error("worker onmessage not registered");
    handler({ data: payload } as MessageEvent);
  }

  it("computes RSI", () => {
    const data = Float32Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i * 0.1) * 5);
    dispatch({ id: "rsi-1", type: "indicator", indicator: "rsi", data, period: 14 });
    expect(messages).toHaveLength(1);
    const msg = messages[0] as { type: string; indicator: string; values: Float32Array };
    expect(msg.type).toBe("indicator-result");
    expect(msg.indicator).toBe("rsi");
    expect(msg.values.length).toBe(40);
  });

  it("computes SMA and EMA", () => {
    const data = Float32Array.from({ length: 30 }, (_, i) => i + 1);
    dispatch({ id: "sma-1", type: "indicator", indicator: "sma", data, period: 5 });
    dispatch({ id: "ema-1", type: "indicator", indicator: "ema", data, period: 5 });
    expect(messages).toHaveLength(2);
    expect((messages[0] as { indicator: string }).indicator).toBe("sma");
    expect((messages[1] as { indicator: string }).indicator).toBe("ema");
  });

  it("computes MACD with signal and histogram", () => {
    const data = Float32Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i * 0.05) * 10);
    dispatch({
      id: "macd-1",
      type: "indicator",
      indicator: "macd",
      data,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    });
    const msg = messages[0] as {
      type: string;
      values: Float32Array;
      signal?: Float32Array;
      histogram?: Float32Array;
    };
    expect(msg.type).toBe("indicator-result");
    expect(msg.values.length).toBe(60);
    expect(msg.signal?.length).toBe(60);
    expect(msg.histogram?.length).toBe(60);
  });

  it("computes Bollinger bands", () => {
    const data = Float32Array.from({ length: 40 }, (_, i) => 50 + i * 0.5);
    dispatch({ id: "bb-1", type: "indicator", indicator: "bollingerBands", data, period: 20, stdDev: 2 });
    const msg = messages[0] as { upper?: Float32Array; lower?: Float32Array; values: Float32Array };
    expect(msg.upper?.length).toBe(40);
    expect(msg.lower?.length).toBe(40);
    expect(msg.values.length).toBe(40);
  });

  it("returns error for unknown indicator", () => {
    dispatch({ id: "bad-1", type: "indicator", indicator: "unknown", data: new Float32Array(10) });
    const msg = messages[0] as { type: string; error: string };
    expect(msg.type).toBe("error");
    expect(msg.error).toContain("Unknown indicator");
  });
});
