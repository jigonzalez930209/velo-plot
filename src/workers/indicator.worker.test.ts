import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("indicator.worker", () => {
  const messages: unknown[] = [];
  let transferLists: Transferable[][] = [];

  beforeEach(async () => {
    messages.length = 0;
    transferLists = [];
    vi.stubGlobal("self", globalThis);
    vi.stubGlobal(
      "postMessage",
      (msg: unknown, transfer?: Transferable[]) => {
        messages.push(msg);
        if (transfer) transferLists.push(transfer);
      },
    );
    vi.resetModules();
    vi.doUnmock("../plugins/analysis/indicators");
    await import("./indicator.worker");
  });

  afterEach(() => {
    vi.doUnmock("../plugins/analysis/indicators");
    vi.unstubAllGlobals();
  });

  function dispatch(payload: Record<string, unknown>) {
    const handler = (globalThis as unknown as { onmessage?: (ev: MessageEvent) => void }).onmessage;
    if (!handler) throw new Error("worker onmessage not registered");
    handler({ data: payload } as MessageEvent);
  }

  it("computes RSI with explicit and default period", () => {
    const data = Float32Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i * 0.1) * 5);
    dispatch({ id: "rsi-1", type: "indicator", indicator: "rsi", data, period: 14 });
    dispatch({ id: "rsi-2", type: "indicator", indicator: "rsi", data });
    expect(messages).toHaveLength(2);
    const msg = messages[0] as { type: string; indicator: string; values: Float32Array; duration: number };
    expect(msg.type).toBe("indicator-result");
    expect(msg.indicator).toBe("rsi");
    expect(msg.values.length).toBe(40);
    expect(msg.duration).toBeGreaterThanOrEqual(0);
    expect(transferLists[0]).toEqual([msg.values.buffer]);
  });

  it("computes SMA and EMA with Float64Array input and default period", () => {
    const f32 = Float32Array.from({ length: 30 }, (_, i) => i + 1);
    const f64 = Float64Array.from({ length: 30 }, (_, i) => i + 1);
    dispatch({ id: "sma-1", type: "indicator", indicator: "sma", data: f32, period: 5 });
    dispatch({ id: "sma-2", type: "indicator", indicator: "sma", data: f64 });
    dispatch({ id: "ema-1", type: "indicator", indicator: "ema", data: f32, period: 5 });
    dispatch({ id: "ema-2", type: "indicator", indicator: "ema", data: f64 });
    expect(messages).toHaveLength(4);
    expect((messages[0] as { indicator: string }).indicator).toBe("sma");
    expect((messages[2] as { indicator: string }).indicator).toBe("ema");
  });

  it("computes MACD with full result and transferable buffers", () => {
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
    dispatch({
      id: "macd-2",
      type: "indicator",
      indicator: "macd",
      data,
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
    expect(transferLists[0].length).toBe(3);
  });

  it("computes MACD when signal and histogram are absent", async () => {
    vi.resetModules();
    vi.doMock("../plugins/analysis/indicators", () => ({
      rsi: () => new Float32Array(0),
      sma: () => new Float32Array(0),
      ema: () => new Float32Array(0),
      macd: () => ({ values: new Float32Array(8) }),
      bollingerBands: () => ({ values: new Float32Array(0) }),
    }));
    messages.length = 0;
    transferLists = [];
    await import("./indicator.worker");

    dispatch({
      id: "macd-partial",
      type: "indicator",
      indicator: "macd",
      data: new Float32Array(8),
    });
    const msg = messages[0] as { type: string; values: Float32Array; signal?: Float32Array };
    expect(msg.type).toBe("indicator-result");
    expect(msg.signal).toBeUndefined();
    expect(transferLists[0]).toEqual([msg.values.buffer]);
  });

  it("computes Bollinger bands with explicit and default parameters", () => {
    const data = Float32Array.from({ length: 40 }, (_, i) => 50 + i * 0.5);
    dispatch({ id: "bb-1", type: "indicator", indicator: "bollingerBands", data, period: 20, stdDev: 2 });
    dispatch({ id: "bb-2", type: "indicator", indicator: "bollingerBands", data });
    const msg = messages[0] as { upper?: Float32Array; lower?: Float32Array; values: Float32Array };
    expect(msg.upper?.length).toBe(40);
    expect(msg.lower?.length).toBe(40);
    expect(msg.values.length).toBe(40);
    expect(transferLists[0].length).toBe(3);
  });

  it("computes Bollinger bands when upper and lower are absent", async () => {
    vi.resetModules();
    vi.doMock("../plugins/analysis/indicators", () => ({
      rsi: () => new Float32Array(0),
      sma: () => new Float32Array(0),
      ema: () => new Float32Array(0),
      macd: () => ({ values: new Float32Array(0) }),
      bollingerBands: () => ({ values: new Float32Array(6) }),
    }));
    messages.length = 0;
    transferLists = [];
    await import("./indicator.worker");

    dispatch({
      id: "bb-partial",
      type: "indicator",
      indicator: "bollingerBands",
      data: new Float32Array(6),
    });
    const msg = messages[0] as { upper?: Float32Array; values: Float32Array };
    expect(msg.type).toBe("indicator-result");
    expect(msg.upper).toBeUndefined();
    expect(transferLists[0]).toEqual([msg.values.buffer]);
  });

  it("returns error for unknown indicator", () => {
    dispatch({ id: "bad-1", type: "indicator", indicator: "unknown", data: new Float32Array(10) });
    const msg = messages[0] as { type: string; error: string };
    expect(msg.type).toBe("error");
    expect(msg.error).toContain("Unknown indicator");
  });

  it("returns error message when indicator calculation throws Error", async () => {
    vi.resetModules();
    vi.doMock("../plugins/analysis/indicators", () => ({
      rsi: () => {
        throw new Error("calc failed");
      },
      sma: () => new Float32Array(0),
      ema: () => new Float32Array(0),
      macd: () => ({ values: new Float32Array(0) }),
      bollingerBands: () => ({ values: new Float32Array(0) }),
    }));
    messages.length = 0;
    await import("./indicator.worker");

    dispatch({ id: "err-1", type: "indicator", indicator: "rsi", data: new Float32Array(5), period: 2 });
    const msg = messages[0] as { type: string; error: string };
    expect(msg.type).toBe("error");
    expect(msg.error).toBe("calc failed");
  });

  it("stringifies non-Error throws in catch block", async () => {
    vi.resetModules();
    vi.doMock("../plugins/analysis/indicators", () => ({
      rsi: () => {
        throw "string failure";
      },
      sma: () => new Float32Array(0),
      ema: () => new Float32Array(0),
      macd: () => ({ values: new Float32Array(0) }),
      bollingerBands: () => ({ values: new Float32Array(0) }),
    }));
    messages.length = 0;
    await import("./indicator.worker");

    dispatch({ id: "err-2", type: "indicator", indicator: "rsi", data: new Float32Array(5) });
    const msg = messages[0] as { type: string; error: string };
    expect(msg.type).toBe("error");
    expect(msg.error).toBe("string failure");
  });
});
