# Signal Processing Pipeline

This guide walks through a complete, end-to-end signal-processing workflow in
velo-plot: **acquire → FFT → filter → detect peaks → annotate**. It ties
together the analysis plugin (`src/plugins/analysis`) so you can go from a noisy
raw signal to an annotated, publication-ready chart.

> All steps run natively in TypeScript — no external DSP dependencies.

## 1. The raw signal

Start with a noisy composite of two sine waves plus Gaussian noise:

```typescript
import { createChart } from 'velo-plot'
import { PluginAnalysis } from 'velo-plot/plugins/analysis'

const N = 1024
const fs = 500 // sample rate (Hz)
const t = Float64Array.from({ length: N }, (_, i) => i / fs)
const clean = t.map((ti) => Math.sin(2 * Math.PI * 20 * ti) + 0.5 * Math.sin(2 * Math.PI * 80 * ti))
const noisy = clean.map((v) => v + (Math.random() - 0.5) * 0.8)

const chart = createChart({ container: '#chart' })
await chart.use(PluginAnalysis())

chart.addSeries({ id: 'raw', type: 'line', data: { x: t, y: Float64Array.from(noisy) } })
```

## 2. Frequency analysis (FFT)

Transform to the frequency domain to see which components dominate:

```typescript
const spectrum = chart.analysis.fft('raw')       // { frequencies, magnitude, phase }
// Plot magnitude vs frequency on a second pane
chart.addSeries({
  id: 'spectrum',
  type: 'line',
  yAxisId: 'freq',
  data: { x: spectrum.frequencies, y: spectrum.magnitude },
})
```

You should see peaks near **20 Hz** and **80 Hz** — the true components.

## 3. Filtering

Suppress the high-frequency component with a low-pass filter, keeping the 20 Hz
carrier:

```typescript
const filtered = chart.analysis.filter('raw', {
  type: 'lowpass',
  cutoff: 40,     // Hz
  sampleRate: fs,
})
chart.addSeries({ id: 'filtered', type: 'line', data: filtered })
```

Available filter types include `lowpass`, `highpass`, `bandpass`, and
`bandstop`. For a smoothing-only pass, a moving average or Savitzky-Golay
filter is also available via the analysis API.

## 4. Peak detection

Detect and label peaks in the cleaned signal:

```typescript
const peaks = chart.analysis.detectPeaks('filtered', {
  minProminence: 0.3,
  minDistance: 10,
})

for (const p of peaks) {
  chart.addAnnotation({
    type: 'text',
    x: p.x,
    y: p.y,
    text: `f\\approx${(1 / (2 * p.width / fs)).toFixed(0)}\\,\\text{Hz}`,
    latex: true,
  })
}
```

## 5. Putting it together

A typical reusable pipeline:

```typescript
function processSignal(chart, seriesId, { cutoff, fs }) {
  const spectrum = chart.analysis.fft(seriesId)
  const filtered = chart.analysis.filter(seriesId, { type: 'lowpass', cutoff, sampleRate: fs })
  const filteredId = `${seriesId}-filtered`
  chart.addSeries({ id: filteredId, type: 'line', data: filtered })
  const peaks = chart.analysis.detectPeaks(filteredId, { minProminence: 0.3 })
  return { spectrum, filtered, peaks }
}
```

## Related

- [Scientific Analysis](./analysis.md) — full analysis API surface
- [Spectral & FFT](../api/analysis-advanced.md)
- [Peak Detection](../api/analysis-peaks.md)
- [Publication-ready Export](./publication-export.md)
