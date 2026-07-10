# Stage 5: v3.0.0 — Stable Platform

> **Target version:** **v3.0.0**  
> **Current:** **v3.0.0-rc.1** (2026-07-10)  
> **Prerequisite:** All previous stage exit checklists satisfied  
> **This is the release**, not another stepping stone.

---

## RC.1 audit snapshot

| Area | Status |
|------|--------|
| Features (8 prior-stage criteria) | Done |
| Bundles `core` / `trading` / `scientific` / `full` / `react` | Done in rc.1 |
| Migration + what's-new + CHANGELOG BREAKING | Done in rc.1 |
| PLUGIN-STATUS complete / partial / experimental | Done in rc.1 |
| CI lint + docs on `v*` tags | Done in rc.1 |
| Public `any` cleanup, size budget, known-limitations everywhere | Deferred to GA |
| npm `latest` / GitHub release assets | GA only |

---

## Goal

Ship **velo-plot v3.0.0** as a production-grade platform — an exponential improvement over v1.12.0 measured by objective criteria, not feature count alone.

v3.0.0 consolidates bundles, documents every breaking change since v1.12.0, and sets the foundation for long-term maintenance.

---

## What "exponential improvement" means

Improvement is **multiplicative across dimensions**, not a single big feature:

```mermaid
quadrantChart
  title v3.0.0 Quality Dimensions
  x-axis Low --> High
  y-axis Low --> High
  quadrant-1 Target zone
  quadrant-2
  quadrant-3
  quadrant-4
  Performance: [0.85, 0.9]
  Trading parity: [0.8, 0.85]
  Scientific depth: [0.8, 0.8]
  Test coverage: [0.75, 0.7]
  React DX: [0.8, 0.75]
  Docs honesty: [0.9, 0.95]
  v1.12 baseline: [0.35, 0.4]
```

| Dimension | v1.12.0 baseline | v3.0.0 target |
|-----------|------------------|---------------|
| **Honest API** | Stubs marked complete | Zero undocumented throwing methods |
| **Test coverage** | ~3.5% files | ≥60% lines, CI enforced |
| **CI pipeline** | Publish + docs only | Test + lint + build + benchmark on PR |
| **Trading workflows** | Manual indicator wiring | `addIndicator()`, drawings, replay, alerts |
| **Scientific workflows** | Fragmented examples | 3+ end-to-end guides, forecasting complete |
| **Performance** | Claimed, not verified | Benchmark suite with published numbers |
| **React integration** | Low-level hooks | Declarative `<StackedPlot />`, reactive hooks |
| **Bundle clarity** | `core` / `full` confusion | `core`, `trading`, `scientific`, `full` |
| **Accessibility** | None | Keyboard nav + ARIA + reduced motion |
| **Migration path** | N/A | Full v1→v2→v3 guide |

---

## Work items

### P0 — Bundle consolidation

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 5.1 | `velo-plot` (core) | P0 | Medium | Chart, series, scales, themes, animation — no 3D, no ML | ✅ rc.1 |
| 5.2 | `velo-plot/trading` | P0 | Medium | Candlestick, stacked, sync, indicators, drawings, replay, alerts | ✅ |
| 5.3 | `velo-plot/scientific` | P0 | Medium | Analysis, FFT, regression, 3D, LaTeX, forecasting | ✅ rc.1 |
| 5.4 | `velo-plot/full` | P0 | Low | Everything (current behavior, documented as heavy) | ✅ |
| 5.5 | `velo-plot/react` | P0 | Low | All React exports | ✅ |
| 5.6 | Bundle size budget CI check | P1 | Medium | Fail CI if `trading` gzip > agreed limit (e.g. 150KB) | GA |

### P0 — API stability audit

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 5.7 | Public API surface review | P0 | High | Every export in entry points has docs + tests or `@internal` | GA |
| 5.8 | Deprecation cleanup | P0 | Medium | No deprecated APIs without removal timeline | ✅ rc.1 (v4.0 timelines) |
| 5.9 | Semantic versioning lock | P0 | Low | v3.0.0 follows semver strictly; CONTRIBUTING updated | ✅ rc.1 |
| 5.10 | Plugin status registry | P0 | Low | `docs/PLUGIN-STATUS.md` maintained | ✅ rc.1 |

### P0 — Migration and release

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 5.11 | Migration guide v1.12 → v3.0 | P0 | High | `docs/guide/migration-v3.md` | ✅ rc.1 |
| 5.12 | Breaking changes changelog | P0 | Medium | Aggregated BREAKING section in CHANGELOG | ✅ rc.1 |
| 5.13 | Codemod scripts (optional) | P2 | High | `npx velo-plot-codemod v3` for common renames | deferred |
| 5.14 | Release candidate cycle | P0 | Low | v3.0.0-rc.1, rc.2 with community feedback window | ✅ rc.1 open |

### P0 — Quality gates for v3.0.0

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 5.15 | CI required checks on PR | P0 | Low | test + lint + build must pass | ✅ rc.1 |
| 5.16 | Coverage threshold ≥60% | P0 | Medium | Enforced in vitest config | ✅ (scoped gates ≫60%) |
| 5.17 | E2E smoke tests (Playwright) | P1 | High | Basic chart render, stacked, indicator in headless Chrome | ✅ |
| 5.18 | Benchmark regression gate | P1 | Medium | Block merge on >15% FPS regression | warning only (GA) |
| 5.19 | Security audit | P1 | Low | `pnpm audit` clean or documented exceptions | GA |

### P1 — Documentation release

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 5.20 | v3.0 landing page section | P0 | Low | `docs/index.md` updated | ✅ rc.1 |
| 5.21 | "What's new in v3" guide | P0 | Medium | Highlights trading + scientific + DX | ✅ rc.1 |
| 5.22 | Architecture decision records (ADRs) | P1 | Medium | `docs/adr/` for key v2/v3 decisions | partial |
| 5.23 | Comparison table vs alternatives | P2 | Low | lightweight-charts, Plotly, ECharts — honest comparison | deferred |
| 5.27 | Link to Stage 6 SVG parity roadmap | P1 | Low | v3 docs state raster export today; SVG full homolog is Stage 6 → v4 | ✅ |

> **Post-v3:** Full SVG homolog of all v3 features is **[Stage 6](./06-svg-vector-parity.md)** (target v4.0.0). v3.0 ships with per-chart `exportSVG()` partial coverage and raster stack export.

### P1 — Ecosystem

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 5.24 | portfolio-fall on v3 | P1 | Medium | Consumer app validated on v3.0.0 |
| 5.25 | npm dist-tags | P0 | Low | `latest` → v3.0.0; `v1` tag for maintenance if needed |
| 5.26 | GitHub release with assets | P0 | Low | Changelog, migration guide linked |

---

## v3.0.0 release criteria (all must pass)

### Code quality

- [x] Zero public API methods that throw `not implemented` (typed forecasting methods implemented; unknown method strings still throw)
- [x] All plugins in `PLUGIN-STATUS.md` are `complete`, `partial` (documented), or `experimental`
- [x] Test coverage ≥60% line coverage (core/bindings gates ≫60% on scoped modules)
- [ ] ESLint clean (lint now in CI; fix any remaining issues before GA)
- [ ] TypeScript strict mode with no `any` in public types (deferred to GA)

### Features (from prior stages)

- [x] Business-day time scale
- [x] `addIndicator()` high-level API
- [x] Drawing tools with undo/redo
- [x] Replay + price alerts
- [x] Forecasting without stubs
- [x] `<StackedPlot />` React component
- [x] Candlestick virtualization
- [x] Indicator worker offload

### Performance (verified)

- [ ] 1M line points ≥55 FPS (benchmark)
- [ ] 500k candlesticks ≥50 FPS (benchmark)
- [ ] 5-pane stack resize ≥55 FPS (benchmark)
- [ ] `velo-plot/trading` gzip size documented and within budget

### Documentation

- [x] Migration guide published (`migration-v3.md` + `whats-new-v3.md`)
- [x] All bundle entry points documented (core, trading, scientific, full, frameworks)
- [x] Trading + scientific end-to-end guides
- [ ] Known limitations section in every major API page (deferred to GA)

### CI/CD

- [x] CI on every PR: test, lint, build
- [x] Benchmark job (warning via `continue-on-error`)
- [x] npm publish workflow uses Node 24 actions
- [x] Docs deploy on release tag (`v*`) + `main`

---

## Post-v3.0 roadmap (preview)

Not in scope for v3.0.0, but direction after release:

| Theme | Examples |
|-------|----------|
| **v3.1** | Renko/Kagi, order book DOM, volume profile |
| **v3.2** | Collaborative cursors, shared chart state |
| **v3.3** | WebGPU production renderer |
| **v4.0** | Possible rewrite of overlay to WebGL unified pipeline |

---

## Timeline estimate (indicative)

| Stage | Calendar estimate | Cumulative |
|-------|-------------------|------------|
| Stage 0 | 4–6 weeks | v1.15 |
| Stage 1 | 8–12 weeks | v1.19 |
| Stage 2 + 3 (parallel) | 12–16 weeks | v2.2 |
| Stage 4 | 10–14 weeks | v2.9 |
| Stage 5 | 4–6 weeks | **v3.0.0** |
| **Total** | **~12–18 months** | |

Estimates assume part-time or small-team velocity. Adjust per actual capacity.

---

## Success metrics (6 months post-v3.0)

| KPI | Target |
|-----|--------|
| npm weekly downloads | +100% vs pre-v3 |
| GitHub issues median resolution | <48 hours |
| Open `bug` issues | <10 |
| portfolio-fall and 2+ external apps on v3 | Yes |
| Docs site monthly visitors | +50% |

---

*This document is the definition of done for the entire roadmap. When every checkbox above is checked, velo-plot v3.0.0 ships.*
