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
