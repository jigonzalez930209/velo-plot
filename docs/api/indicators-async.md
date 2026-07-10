---
title: Async Indicator Workers
description: Off-main-thread RSI, MACD, EMA, SMA, and Bollinger Bands via a shared worker pool.
---

# Async Indicator Workers

Stage 1 ships CPU-heavy indicators on a shared Web Worker pool so the main thread stays responsive during large-series analysis.

## API

```typescript
import {
  rsiAsync,
  smaAsync,
  emaAsync,
  macdAsync,
  bollingerBandsAsync,
  destroyIndicatorPool,
} from 'velo-plot/scientific';

const closes = new Float32Array(100_000);
// ... fill closes ...

const rsi = await rsiAsync(closes, 14);
const sma = await smaAsync(closes, 20);
const ema = await emaAsync(closes, 12);
const macd = await macdAsync(closes, 12, 26, 9);
const bb = await bollingerBandsAsync(closes, 20, 2);

// Optional: tear down workers when done
destroyIndicatorPool();
```

## Supported indicators

| Function | Description |
|----------|-------------|
| `rsiAsync(data, period)` | Relative Strength Index |
| `smaAsync(data, period)` | Simple Moving Average |
| `emaAsync(data, period)` | Exponential Moving Average |
| `macdAsync(data, fast, slow, signal)` | MACD line, signal, histogram |
| `bollingerBandsAsync(data, period, stdDev)` | Upper, middle, lower bands |

## Pool lifecycle

Workers are created lazily on first use and reused across calls. Use `destroyIndicatorPool()` when unloading the chart or navigating away to free threads.

```typescript
import { getIndicatorPoolSize } from 'velo-plot/scientific';

console.log(getIndicatorPoolSize()); // active worker count
```

## See also

- [Large Datasets Guide](/guide/large-datasets)
- [Performance Guide](/guide/performance)
- [Stage 1 benchmarks](/guide/large-datasets#benchmarks)
