---
title: Business-Day Time Scale
description: Skip weekends on the X axis while keeping epoch timestamps in data and tooltips.
---

# Business-Day Time Scale

Stage 2 adds a market-aware time scale that maps epoch-millisecond timestamps to consecutive logical indices, skipping weekends (and optionally session hours in future presets).

## Chart configuration

```typescript
import { createStackedChart } from 'velo-plot/trading'

const stack = createStackedChart({
  container,
  panes: [/* ... */],
  xAxis: {
    type: 'time',
    timeScale: {
      calendar: 'business-day', // skip weekends
      session: '24x7',            // 'NYSE' reserved for session-hour filtering
      timezone: 'America/New_York',
    },
  },
})
```

| Option | Values | Description |
|--------|--------|-------------|
| `calendar` | `'continuous'` \| `'business-day'` | `'continuous'` = legacy epoch-ms axis; `'business-day'` = skip non-trading days |
| `session` | `'24x7'`, `'NYSE'`, … | Session preset (MVP: weekends only) |
| `timezone` | IANA string | Used for tick formatting |

OHLC `x` values remain epoch milliseconds. The chart maps them internally; series data returned via `getData()` uses logical indices with `NaN` gaps for skipped bars.

## Low-level utilities

```typescript
import {
  mapToBusinessDayScale,
  isBusinessDay,
  businessDaySpanMs,
  applyBusinessDayX,
  formatBusinessDayTick,
} from 'velo-plot/trading'

const times = Float64Array.from([
  Date.UTC(2024, 0, 5), // Friday
  Date.UTC(2024, 0, 6), // Saturday — skipped
  Date.UTC(2024, 0, 8), // Monday
])

const mapped = mapToBusinessDayScale(times, { calendar: 'business-day' })
// mapped.scaledX → [0, NaN, 1]
// mapped.timeByIndex → [Friday_ms, Monday_ms]

isBusinessDay(Date.UTC(2024, 0, 6)) // false (Saturday)
```

## Related

- [Trading Session example](/examples/trading-session)
- [Trading Bundle](/api/trading-bundle)
