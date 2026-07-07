# Candlestick Series

Candlestick charts are used to describe price movements of a security, derivative, or currency.

## Configuration

Candlestick is a type of series added via `addSeries`.

```typescript
chart.addSeries({
  id: 'btc-usd',
  type: 'candlestick',
  data: {
    x: timestamps, // Float32Array
    open: open,     // Float32Array
    high: high,     // Float32Array
    low: low,       // Float32Array
    close: close    // Float32Array
  },
  style: {
    bullishColor: '#26a69a',
    bearishColor: '#ef5350',
    barWidth: 0.8
  }
})
```

## Data Object

The `data` object for a candlestick series must contain the following `Float32Array` fields:

| Field | Description |
|-------|-------------|
| `x` | Timestamps or indices |
| `open` | Initial price for the period |
| `high` | Maximum price for the period |
| `low` | Minimum price for the period |
| `close` | Final price for the period |

## Styling Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `bullishColor` | `string` | `'#26a69a'` | Color for candles where `close >= open` |
| `bearishColor` | `string` | `'#ef5350'` | Color for candles where `close < open` |
| `barWidth` | `number` | `0.8` | Relative width of the candle body (0 to 1) |
| `opacity` | `number` | `1.0` | Opacity of the candles |
| `hollow` | `boolean` | `false` | When `true`, bullish bodies render as outlines (Stage 2) |

## Heikin-Ashi series (Stage 2)

```typescript
chart.addSeries({
  id: 'ha',
  type: 'heikin-ashi',
  data: { x: timestamps, open, high, low, close },
})
```

Or transform manually with `computeHeikinAshi()` from `velo-plot/trading`. See [Heikin-Ashi example](/examples/trading/heikin-ashi).

## Trade markers (Stage 2)

```typescript
chart.getSeries('btc-usd')?.setMarkers([
  { time: timestamps[10], shape: 'arrowUp', position: 'belowBar', text: 'Buy' },
])
```

See [Alerts & Markers API](/api/trading-alerts).

## Updating Data

You can replace or append data just like any other series.

```typescript
// Appending a new candle
chart.updateSeries('btc-usd', {
  x: new Float32Array([now]),
  open: new Float32Array([100]),
  high: new Float32Array([110]),
  low: new Float32Array([95]),
  close: new Float32Array([105]),
  append: true
});
```

## SVG Export Support

Candlestick series are fully supported in SVG export, rendering each candle as a combination of a line (wick) and a rectangle (body).
