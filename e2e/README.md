# E2E tests (Playwright)

Browser scenarios run against `docs/public/e2e/harness.html` with the built library (`dist/velo-plot.full.js`).

## First-time local setup

```bash
pnpm test:e2e:setup
```

This builds the library and installs **Chromium**, **Firefox**, and **WebKit**.

On a fresh Linux machine without browser libraries, also run (requires sudo):

```bash
pnpm test:e2e:install:deps
```

## Run tests

```bash
pnpm test:e2e                 # all 3 browsers
pnpm test:e2e:artifacts       # same + trace/screenshot/video on every test
pnpm test:e2e:report          # open HTML report after a run
pnpm test:e2e:chromium        # single project
pnpm test:e2e:firefox
pnpm test:e2e:webkit
pnpm test:e2e:ui              # interactive UI mode
pnpm test:e2e:headed          # visible browser windows
```

## Scripts

| Script | Purpose |
|--------|---------|
| `test:e2e:install` | Download browser binaries (no sudo) |
| `test:e2e:install:deps` | Browsers + OS packages (`--with-deps`) |
| `test:e2e:setup` | `pnpm build` + `test:e2e:install` |

CI sets `CI=true` so `test:e2e:install` automatically uses `--with-deps` on Ubuntu runners.

## Artifacts (local review)

After `pnpm test:e2e` (or `pnpm test:e2e:artifacts` for full traces/videos on every test):

| Path | Contents |
|------|----------|
| `test-results/e2e/report/` | HTML report — open `index.html` or run `pnpm test:e2e:report` |
| `test-results/e2e/results.json` | Machine-readable summary |
| `test-results/e2e/artifacts/` | Per-test folders (screenshots, traces `.zip`, videos on failure) |

The whole `test-results/` tree is gitignored.

## Coverage policy

| Layer | Scope | Command |
|-------|--------|---------|
| Unit + integration | Core, stacked, indicators, Stage 2 trading, workers | `pnpm test:coverage` |
| E2E catalog sync | Playwright ids ↔ harness scenarios | `e2e/scenario-catalog.test.ts` |
| Browser scenarios | 54 harness scenarios × 3 browsers | `pnpm test:e2e` |

Thresholds (global): **80%** lines/statements, **75%** functions, **70%** branches.

New features must add:
1. Unit tests under `src/**/*.test.ts`
2. Harness scenario in `docs/public/e2e/scenarios/`
3. Id in `e2e/scenario-ids.ts` (catalog test fails if missing)
