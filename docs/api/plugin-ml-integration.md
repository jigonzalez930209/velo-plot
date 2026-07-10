---
title: PluginMLIntegration
description: Bridge for integrating custom AI models into your charts
---

# PluginMLIntegration

The `PluginMLIntegration` provides a standardized interface for connecting machine learning models (e.g., Tensorflow.js, ONNX) to the Velo Plot. It handles data extraction, asynchronous inference, and high-performance visualization of predictions and confidence intervals.

## Core API

### `registerModel(model)`
Register a custom model implementation that satisfies the `MLModelAPI` interface.

```typescript
chart.ml.registerModel({
  id: 'my-nn-forecaster',
  name: 'Forecasting Model',
  type: 'forecasting',
  async predict(data) {
    // data.x and data.y are plain arrays extracted from series
    const prediction = await myLoadedModel.predict(tf.tensor(data.y));
    return {
      x: futureXArray,
      y: predictionArray,
      confidence: confidenceIntervalArray
    };
  }
});
```

### `runInference(modelId, seriesId)`
Runs analysis on a specific data series. It returns the `PredictionResult` directly.

### `visualizeResults(result, config)`
Renders the result on the chart overlay. This is extremely efficient as it avoids creating new heavy-weight series for transient predictions.

- `showConfidenceInterval`: Renders a translucent band around the prediction.
- `intervalOpacity`: Control the transparency of the confidence band.
- `lineStyle`: Customize the appearance of the prediction curve.

### `visualizePredictions(result, config)`
Intent-revealing alias for `visualizeResults`, for the prediction-overlay use
case.

### `trainModel(modelId, { x, y })`
Trains a small native regression model on the fly. Creates a native
linear-regression model if `modelId` does not exist yet. Returns fit
diagnostics for a residual plot:

```typescript
const fit = chart.ml.trainModel('trend', {
  x: [[0], [1], [2], [3], [4]],   // feature rows
  y: [2.1, 3.9, 6.2, 7.8, 10.1],  // targets
})
// fit -> { coefficients, intercept, fitted, residuals, r2, rmse }
chart.addSeries({ id: 'residuals', type: 'scatter', data: { x: fit.fitted, y: fit.residuals } })
```

### `listModels()`
Returns the descriptors of all registered models.

## Model audit (supported native models)

velo-plot ships **native, dependency-free** models. External frameworks
(TensorFlow.js, ONNX) can be bridged via `registerModel`.

| Native model type | Capability | Limits |
|-------------------|-----------|--------|
| `linear-regression` | OLS fit via normal equations (general N×N inverse) | Linear relationships only; no regularisation |
| `neural-network` | Feed-forward inference (relu/sigmoid/tanh) | **Inference only** — no native backprop training |
| `signal-processor` | Low/high/band-pass filtering | First-order (EMA-based) filters |

**Statistics helpers** (`chart.ml.stats`): `fft` (naive O(n²) DFT — fine for
small windows), `mean`, `standardDeviation`, `correlation`.

> Honest scope note: the native NN performs inference only. For training deep
> models, load weights from an external framework and bridge via
> `registerModel`. Native `trainModel` covers linear/multivariate regression.

## Scientific Application

Specifically designed for:
- **Real-time Signal Denoising**: Using autoencoders to predict clean signals.
- **Anomaly Detection**: Visualizing probability scores across a time series.
- **Electrochemical Forecasting**: Predicting peak positions in future CV cycles.
- **Trend Extrapolation**: Using LSTMs to forecast multi-variable trends.
