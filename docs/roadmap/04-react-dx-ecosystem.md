# Stage 4: React, DX & Ecosystem

> **Target versions:** v2.2.0 → v2.9.0  
> **Prerequisite:** Stages 2 and 3 substantially complete  
> **Next stage:** [05-v3-stable-platform.md](./05-v3-stable-platform.md)

---

## Goal

Make velo-plot as pleasant to integrate as any modern chart library. First-class React components, reactive hooks, accessibility, polished touch UX, and developer tooling that reduces boilerplate by 50%+.

---

## Current state

### React integration (`src/react/`)

| Export | File | Status |
|--------|------|--------|
| `VeloPlot` | `VeloPlot.tsx` | ✅ Declarative single chart |
| `useVeloPlot` | `useVeloPlot.ts` | ✅ Lifecycle hook |
| `useStackedPlot` | `useStackedPlot.ts` | ⚠️ Mount-only — does not react to prop changes |

### Gaps

| Gap | Impact |
|-----|--------|
| No `StackedPlot` component | Users must wire `useStackedPlot` manually |
| Hooks not reactive to options/theme/panes | Changing props requires manual destroy/recreate |
| No `useIndicator` hook | Manual calculate + `buildIndicatorPane` |
| No `useChartGroup` hook | Sync groups only via imperative API |
| `VeloPlotSeries` props limited | No candlestick, indicator, heatmap in declarative props |
| `./react` export missing (Stage 0) | Broken import path in README |
| No SSR guidance | Canvas/WebGL assumes browser |
| Basic touch only | No documented pinch-zoom |
| No accessibility | No ARIA, keyboard chart navigation, screen reader |
| No plugin scaffolding CLI | Plugins created by copy-paste |
| No online playground | Docs have examples but no editable sandbox |

---

## Work items

### P0 — React components

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 4.1 | `<StackedPlot />` component | P0 | Medium | Declarative panes, indicators, sync props |
| 4.2 | Reactive `useStackedPlot` | P0 | High | Changing `panes`, `theme`, `sync` updates chart without full remount |
| 4.3 | Reactive `useVeloPlot` | P0 | High | Same for single chart |
| 4.4 | `useIndicator(chart, 'rsi', options)` | P0 | Medium | Wraps Stage 2 `addIndicator()` |
| 4.5 | `useChartSync(charts, options)` | P1 | Medium | Hook for non-stacked sync |
| 4.6 | Extend `VeloPlot` series types | P1 | Medium | candlestick, bar, indicator in props |

### P0 — Export and types

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 4.7 | `velo-plot/react` entry with full types | P0 | Low | Builds and publishes (Stage 0 prerequisite) |
| 4.8 | Strict React 18+ types | P1 | Low | `ref` forwarding on components |

### P1 — Accessibility

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 4.9 | ARIA roles on chart container | P1 | Medium | `role="img"`, `aria-label` with data summary |
| 4.10 | Keyboard navigation | P1 | High | Tab focus, arrow pan, +/- zoom, Escape reset |
| 4.11 | Screen reader data table fallback | P2 | Medium | Hidden table with visible range data |
| 4.12 | High contrast theme preset | P1 | Low | WCAG AA contrast ratios |
| 4.13 | `prefers-reduced-motion` support | P1 | Low | Disable animations when requested |

### P1 — Touch and mobile

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 4.14 | Pinch-to-zoom | P1 | High | Two-finger pinch on `InteractionManager` |
| 4.15 | Double-tap reset zoom | P1 | Low | Common mobile pattern |
| 4.16 | Touch-optimized hit areas | P1 | Low | Extend `src/core/responsive/` |
| 4.17 | Mobile trading example | P2 | Low | Responsive stacked chart demo |

### P1 — Developer experience

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 4.18 | `velo-plot create-plugin` CLI | P1 | Medium | Scaffolds plugin with tests and docs template |
| 4.19 | VS Code snippets package | P2 | Low | chart, series, stacked, indicator snippets |
| 4.20 | StackBlitz / CodeSandbox template | P1 | Low | One-click starter linked from docs |
| 4.21 | TypeDoc or equivalent API docs generation | P2 | Medium | Complements VitePress narrative docs |
| 4.22 | Error messages improvement pass | P1 | Medium | Actionable errors for common mistakes |

### P2 — Framework expansion

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 4.23 | Vue composables (`useVeloPlot`) | P2 | Medium | Docs already use Vue in VitePress — dogfood |
| 4.24 | Svelte actions / stores | P3 | Medium | Evaluate community demand |
| 4.25 | SSR-safe dynamic import pattern | P2 | Low | Document `typeof window` guard pattern |

---

## React API sketch (v2.5+)

```tsx
import { StackedPlot } from 'velo-plot/react'

<StackedPlot
  theme="midnight"
  sync={{ axis: 'x', syncCursor: true }}
  panes={[
    { id: 'price', type: 'candlestick', data: ohlc },
    { id: 'volume', type: 'bar', data: volume },
  ]}
  indicators={[
    { type: 'rsi', period: 14 },
    { type: 'macd', fast: 12, slow: 26, signal: 9 },
  ]}
  onCrosshairMove={(e) => setPrice(e.price)}
  drawingTools={['trendline', 'horizontal']}
/>
```

---

## DX metrics (targets for v2.9.0)

| Metric | Current (v1.12) | Target (v2.9) |
|--------|-----------------|----------------|
| Lines to render price+volume+RSI+MACD | ~80–120 | ≤30 |
| React prop change → chart update | Manual remount | Automatic |
| Lighthouse a11y score (chart page) | Unknown | ≥85 |
| Time to first chart (new dev) | ~30 min | ≤10 min with template |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Reactive hooks cause render loops | Deep-compare options; use refs for chart instance |
| a11y for canvas is inherently limited | Data table fallback + keyboard alternatives |
| Multi-framework support dilutes focus | React first; Vue second; others on demand |
| CLI maintenance burden | Minimal template; versioned with library |

---

## Exit checklist (v2.9.0)

- [x] `<StackedPlot />` shipped with docs and example
- [x] `useStackedPlot` and `useVeloPlot` reactive to prop changes
- [x] `useIndicator` hook shipped
- [x] `velo-plot/react` export stable
- [x] Keyboard navigation for pan/zoom/reset
- [x] Pinch-to-zoom on touch devices
- [x] High contrast theme
- [x] Plugin scaffolding CLI
- [x] Online starter template linked from docs
- [x] Framework bindings: Vue, Svelte, SolidJS, Angular, Astro
- [x] Vitest coverage for React/shared bindings tests
