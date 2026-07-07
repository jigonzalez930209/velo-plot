/**
 * Mock datafeed for demos and tests (Stage 2.25).
 */

import type {
  Bar,
  DatafeedAdapter,
  HistoryRequest,
  SubscribeBarsRequest,
  SymbolInfo,
} from "./datafeed";

export interface MockDatafeedOptions {
  symbol?: string;
  barMs?: number;
  basePrice?: number;
  seed?: number;
}

function pseudoRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateBars(from: number, to: number, barMs: number, base: number, rand: () => number): Bar[] {
  const bars: Bar[] = [];
  let price = base;
  for (let t = from; t <= to; t += barMs) {
    const open = price;
    const delta = (rand() - 0.48) * 2;
    const close = Math.max(1, open + delta);
    const high = Math.max(open, close) + rand() * 1.5;
    const low = Math.min(open, close) - rand() * 1.5;
    bars.push({
      time: t,
      open,
      high,
      low,
      close,
      volume: 1000 + rand() * 5000,
    });
    price = close;
  }
  return bars;
}

export function createMockDatafeed(options: MockDatafeedOptions = {}): DatafeedAdapter {
  const barMs = options.barMs ?? 60_000;
  const basePrice = options.basePrice ?? 100;
  const rand = pseudoRandom(options.seed ?? 42);
  const cache = new Map<string, Bar[]>();

  return {
    async resolveSymbol(sym: string): Promise<SymbolInfo> {
      return {
        symbol: sym,
        name: sym,
        description: `Mock symbol ${sym}`,
        timezone: "UTC",
        session: "24x7",
        pricescale: 100,
      };
    },

    async getBars(request: HistoryRequest): Promise<Bar[]> {
      const key = `${request.symbol}:${request.from}:${request.to}`;
      if (!cache.has(key)) {
        cache.set(
          key,
          generateBars(request.from, request.to, barMs, basePrice, rand),
        );
      }
      return cache.get(key)!;
    },

    subscribeBars(request: SubscribeBarsRequest): () => void {
      let last = basePrice + rand() * 5;
      const timer = setInterval(() => {
        const open = last;
        const close = Math.max(1, open + (rand() - 0.5) * 2);
        const high = Math.max(open, close) + rand();
        const low = Math.min(open, close) - rand();
        request.onBar({
          time: Date.now(),
          open,
          high,
          low,
          close,
          volume: 1000 + rand() * 3000,
        });
        last = close;
      }, barMs);
      return () => clearInterval(timer);
    },
  };
}
