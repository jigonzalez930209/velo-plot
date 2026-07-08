# Cyclic Voltammetry Analysis

Cyclic voltammetry (CV) is a core electrochemical technique and one of
velo-plot's original motivating use cases. This guide covers an end-to-end CV
workflow: plotting the current–potential loop, identifying anodic/cathodic peak
pairs, measuring peak separation, and estimating diffusion behaviour.

## 1. Plotting the voltammogram

A CV sweep produces current (`I`) as a function of applied potential (`E`),
traced as a closed loop as the potential is swept forward and back.

```typescript
import { createChart } from 'velo-plot'
import { PluginAnalysis } from 'velo-plot/plugins/analysis'

const chart = createChart({
  container: '#cv',
  xAxis: { label: 'E / V vs Ag/AgCl' },
  yAxis: { label: 'I / \\mu A', latex: true },
})
await chart.use(PluginAnalysis())

// `E` sweeps up then back down; `I` is the measured current.
chart.addSeries({ id: 'cv', type: 'line', data: { x: E, y: I } })
```

Because a CV curve doubles back on itself, plot it as a single ordered series
(the forward and reverse scans share the series) so the hysteresis loop renders
correctly.

## 2. Locating redox peaks

The anodic (oxidation) and cathodic (reduction) peaks are the local extrema of
the current. Split the loop into forward and reverse scans, then run peak
detection on each half:

```typescript
const turningPoint = E.indexOf(Math.max(...E)) // apex of the sweep
const forward = { x: E.slice(0, turningPoint), y: I.slice(0, turningPoint) }
const reverse = { x: E.slice(turningPoint), y: I.slice(turningPoint) }

const anodic = chart.analysis.detectPeaksInData(forward, { minProminence: 1 })
const cathodic = chart.analysis.detectPeaksInData(
  { x: reverse.x, y: reverse.y.map((v) => -v) }, // invert to find minima
  { minProminence: 1 },
)
```

## 3. Peak separation (ΔEp)

The peak-to-peak separation is diagnostic of electrochemical reversibility:

```typescript
const Epa = anodic[0].x     // anodic peak potential
const Epc = cathodic[0].x   // cathodic peak potential
const deltaEp = Math.abs(Epa - Epc)

chart.addAnnotation({
  type: 'text',
  x: (Epa + Epc) / 2,
  y: 0,
  text: `\\Delta E_p = ${(deltaEp * 1000).toFixed(0)}\\,\\text{mV}`,
  latex: true,
})
```

For a reversible one-electron couple at 25 °C, ΔEp ≈ 59 mV; larger values
indicate quasi-reversible or irreversible kinetics.

## 4. Randles–Ševčík: diffusion check

Peak current scales with the square root of scan rate for a
diffusion-controlled process. Fit `Ip` vs `√ν` with the regression plugin:

```typescript
import { PluginRegression } from 'velo-plot/plugins/regression'
await chart.use(PluginRegression())

const sqrtRate = scanRates.map(Math.sqrt)
const fit = chart.regression.fit(
  { x: sqrtRate, y: peakCurrents },
  { type: 'linear' },
)
// A high fit.r2 (≈1) confirms diffusion control.
```

## 5. Polar / radar comparison of samples (optional)

To compare several electrochemical descriptors (ΔEp, Ipa/Ipc ratio, onset
potential, peak current) across samples at a glance, feed them to a radar
chart via `PluginRadar`.

## Related

- [Signal Processing Pipeline](./signal-processing.md)
- [Curve Fitting](../api/fitting.md)
- [Cyclic Voltammetry example](../examples/cyclic-voltammetry.md)
- [Publication-ready Export](./publication-export.md)
