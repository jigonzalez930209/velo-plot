# Time Series Forecasting

The `PluginForecasting` provides a suite of algorithms to predict future values based on historical time series data. It supports various statistical models from simple moving averages to complex seasonal models.

## Features

- **Multiple Algorithms**: SMA, WMA, EMA, Simple Exponential Smoothing, Linear Trend, Holt (Double), Holt-Winters (Triple), and **ARIMA(p,d,q)**.
- **Seasonal Support**: Automated detection and modeling of periodic cycles.
- **Confidence Bands**: Every method returns `lowerBound`/`upperBound` computed from in-sample residuals; bands widen with the horizon for trend/AR models.
- **Visual Overlays**: Automated rendering of forecast lines and shaded confidence intervals.
- **Series Integration**: Direct integration with the chart's data engine.
- **API Access**: Programmatic access to prediction results and fit metrics (`mse`, `rmse`, `mae`, `r2`).

## Interactive Demo

<ForecastingDemo height="500px" />

## Usage

To use forecasting, register the plugin and then call the forecasting API.

```typescript
import { createChart, PluginForecasting } from 'velo-plot';

const chart = createChart({ container: 'chart-id' });

// Register plugin
await chart.use(PluginForecasting({
  defaultVisualization: {
    lineStyle: { color: '#fbbf24', dash: [5, 5] },
    showConfidenceInterval: true
  }
}));

// Run forecast on a series
const result = await chart.forecasting.forecastSeries('my-series-id', {
  method: 'holtWinters',
  horizon: 50,
  params: { period: 12 } // Monthly seasonality
});

// Visualize it
chart.forecasting.visualize(result);
```

## Forecasting Methods

### 1. Simple Moving Average (SMA)
Calculates the average of the last `N` points and projects it forward as a constant. Best for stable data without clear trends.

### 2. Linear Projection
Fits a first-order polynomial ($y = mx + b$) to the historical data using least squares and extends the line into the future. Ideal for data with a consistent linear trend.

### 3. Holt's Linear Trend (Double Exp Smoothing)
Separates the level and the trend components. It adapts to changes in the trend over time, making it superior to simple linear regression for changing trends.

### 4. Holt-Winters (Triple Exp Smoothing)
The most advanced smoothing model, adding a **Seasonal** component. It requires at least two full cycles of data to accurately model periodic behaviors (e.g., daily power consumption, yearly sales).

### 5. ARIMA(p, d, q)
A native AutoRegressive Integrated Moving Average model. The series is
differenced `d` times for stationarity, then AR(`p`) and MA(`q`) coefficients
are estimated with the two-stage Hannan-Rissanen procedure and the forecast is
integrated back to the original scale.

```typescript
// ARIMA(1,1,1) forecast directly from a series id
const result = chart.forecasting.forecast('sales', {
  method: 'arima',
  horizon: 50,
  confidence: 0.95,
  params: { p: 1, d: 1, q: 1 },
})
chart.forecasting.visualize(result)
```

ARIMA gracefully falls back to Holt's linear trend when the history is too
short to fit the requested orders.

## Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `method` | `string` | Method ID (`sma`, `wma`, `ema`, `expSmoothing`, `linear`, `holt`, `holtWinters`, `arima`) |
| `horizon` | `number` | Number of data points to project |
| `confidence` | `number` | Confidence level for the band (default `0.95`) |
| `params.alpha` | `number` | Level smoothing factor (0 to 1) |
| `params.beta` | `number` | Trend smoothing factor (0 to 1) |
| `params.gamma` | `number` | Seasonality smoothing factor (0 to 1) |
| `params.period` | `number` | Cycle length (e.g., 24 for hourly, 12 for monthly) |
| `params.p` / `params.d` / `params.q` | `number` | ARIMA orders |

## Confidence Bands

Every forecast includes a shaded confidence band. The half-width is
`z(confidence) · σ · √h` for trend and AR models (widening with the horizon
`h`) and `z(confidence) · σ` for the flat moving-average methods, where `σ` is
the in-sample one-step residual standard deviation. Increase `confidence` (e.g.
`0.99`) for wider bands.
