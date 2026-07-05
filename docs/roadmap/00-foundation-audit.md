# Stage 0: Foundation Audit

> **Target versions:** v1.13.0 → v1.15.0  
> **Prerequisite:** None (start here)  
> **Next stage:** [01-render-engine-performance.md](./01-render-engine-performance.md)

---

## Goal

Establish an honest baseline. Fix stubs falsely marked as complete, add CI quality gates, align package exports with the build, and raise test coverage in core areas so future stages do not regress.

This stage delivers **trust** — users and contributors can rely on what the docs and API claim.

---

## Current state

### What works well (v1.12.0)

| Area | Evidence |
|------|----------|
| Dual-canvas render loop (WebGL + 2D overlay) | `src/core/chart/ChartRenderLoop.ts` |
| Stacked multi-pane charts (1–5 panes) | `src/core/stacked/createStackedChart.ts` |
| X-axis sync, cursor sync, pan/zoom propagation | `src/core/sync/index.ts` |
| 19 technical indicator **calculation** functions | `src/plugins/analysis/indicators.ts` |
| Composite indicator pane builder | `src/core/indicator/buildIndicatorPane.ts` |
| Candlestick rendering | `src/renderer/CandlestickRenderer.ts` |
| 58 passing unit tests (local) | `pnpm test` |

### What is broken or misleading

| Item | File | Problem |
|------|------|---------|
| Selection sync | `src/core/sync/index.ts:327` | `handleSelection()` is empty |
| PluginSync | `src/plugins/sync/index.ts` | `onInit` with empty `groupId` — no behavior |
| PluginForecasting | `src/plugins/forecasting/algorithms.ts:55` | Several methods throw `not implemented` |
| Custom patterns | `src/plugins/pattern-recognition/patterns.ts:631` | Throws `'Custom pattern not implemented'` |
| WebGPU renderer | `src/core/chart/ChartCore.ts:317` | Warns "experimental and not yet implemented" |
| React export | `package.json` | No `./react` subpath; README may reference invalid import |
| Build entries | `vite.config.lib.ts` | Fewer entry points than `package.json` exports |
| CI | `.github/workflows/` | Only `publish.yml` and `deploy-docs.yml` — no tests |

### Test coverage snapshot

- **11** `.test.ts` files covering sync, stacked, indicators, scaling, formatting, tooltips
- **~310** source `.ts` files → ~3.5% file coverage
- No `coverage` config in `vitest.config.ts`
- Tests run in `node` environment (no jsdom/canvas)

---

## Work items

### P0 — Stub audit and fixes

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 0.1 | Implement `ChartGroup.handleSelection` | P0 | Medium | Selecting a point/region on master propagates to slaves when `syncSelection: true`; covered by unit tests in `src/core/sync/index.test.ts` |
| 0.2 | Implement or remove `PluginSync` | P0 | Low | Either wire to `ChartGroup` with real `groupId` behavior, or mark `@deprecated` and document `ChartGroup` as the canonical API |
| 0.3 | Audit all plugins marked "complete" in legacy roadmap | P0 | Medium | Spreadsheet or markdown table: each plugin → `complete` / `partial` / `stub`; update docs to match |
| 0.4 | Fix `PluginForecasting` or narrow documented API | P1 | Medium | Either implement ARIMA/simple methods natively, or remove throwing methods from public exports and docs |
| 0.5 | Implement or remove custom pattern API | P1 | High | Custom pattern registration works end-to-end, or API is removed with migration note |

### P0 — Package and build integrity

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 0.6 | Add `./react` export to `package.json` | P0 | Low | `import { SciPlot } from 'velo-plot/react'` resolves; types included |
| 0.7 | Align `vite.config.lib.ts` entries with all `package.json` exports | P0 | Medium | Every declared subpath builds; CI verifies with `pnpm build` |
| 0.8 | Document bundle strategy (`core` vs `full` vs future `trading`) | P1 | Low | Section in README and [installation guide](../guide/installation.md) |

### P0 — CI and quality gates

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 0.9 | Add `.github/workflows/ci.yml` | P0 | Low | Runs on PR + push to `main`: `pnpm install`, `pnpm test`, `pnpm build` |
| 0.10 | Add lint to CI (ESLint if configured, or add config) | P1 | Medium | CI fails on lint errors |
| 0.11 | Enable Vitest coverage with baseline threshold | P1 | Low | `coverage` reporter enabled; threshold ≥15% lines (raise each stage) |
| 0.12 | Pin GitHub Actions to Node 24 runtime (v5/v6 actions) | P1 | Low | No Node 20 deprecation warnings in CI logs |

### P1 — Core test expansion

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 0.13 | Tests for `buildIndicatorPane` edge cases | P1 | Medium | New file `src/core/indicator/buildIndicatorPane.test.ts` |
| 0.14 | Tests for `createStackedChart` resize + sync options | P1 | Medium | Extend `createStackedChart.test.ts` |
| 0.15 | Tests for `NavigationUtils` volume pinning regression | P1 | Low | Already exists — ensure CI runs them |
| 0.16 | Integration test: stacked + indicator + sync smoke | P1 | Medium | One test creates 3-pane stack, syncs pan, asserts bounds |

### P2 — Documentation hygiene

| ID | Task | Priority | Complexity | Definition of done |
|----|------|----------|------------|-------------------|
| 0.17 | Archive legacy roadmap (done) | P0 | Low | `docs/ROADMAP-LEGACY.md` with redirect notice |
| 0.18 | Add "Known limitations" section to chart-sync and stacked-chart API docs | P1 | Low | Documents `syncSelection` status until fixed |
| 0.19 | Strict CHANGELOG policy in CONTRIBUTING.md | P2 | Low | Every PR with user-facing change updates CHANGELOG |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Removing stub APIs breaks early adopters | Deprecate in v1.14, remove in v2.0 with migration guide |
| Coverage threshold blocks merges | Start low (15%), increase per stage |
| Build entry alignment reveals dead exports | Remove unused exports or implement missing builds |

---

## Exit checklist (v1.15.0)

- [ ] `syncSelection` works and is tested
- [ ] Plugin audit table published in `docs/roadmap/README.md` or separate `PLUGIN-STATUS.md`
- [ ] `./react` export works
- [ ] All `package.json` exports build successfully
- [ ] CI workflow green on every PR (test + build)
- [ ] Vitest coverage ≥15% lines
- [ ] No public API method throws `not implemented` without `@experimental` tag
- [ ] CHANGELOG entries for v1.13.0, v1.14.0, v1.15.0

---

## Suggested release cadence

| Version | Focus |
|---------|-------|
| v1.13.0 | CI workflow, `./react` export, syncSelection fix |
| v1.14.0 | Plugin audit, forecasting/pattern API cleanup |
| v1.15.0 | Build alignment, coverage threshold, test expansion |
