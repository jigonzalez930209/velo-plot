# Security audit — v3.0.0 GA

> **Last reviewed:** 2026-07-10  
> **Tool:** `pnpm audit` (pnpm 11)

## Summary

`pnpm audit` reports **transitive** vulnerabilities in optional dev/tooling dependencies (primarily **Astro** and **VitePress** doc build chain). **Runtime library code** shipped in `dist/` does not bundle these packages.

| Severity (reported) | Count | Action |
|---------------------|-------|--------|
| High | 16 | Documented below — dev-only paths |
| Moderate | 14 | Documented below |
| Low | 2 | Monitor |

## Documented exceptions

### Astro (devDependency / docs examples)

- **Issue:** Transitive `esbuild`, `devalue`, and related advisories via `astro@5.x`.
- **Exposure:** Local `docs:build`, Astro example assets — **not** published npm package runtime.
- **Mitigation:** Pin Astro on minor updates; revisit when advisories patch upstream. `esbuild` devDependency pinned ≥0.28.1 where applicable.

### Vite / VitePress (devDependencies)

- **Issue:** Historical esbuild dev-server advisory (Windows-only arbitrary read).
- **Exposure:** `pnpm dev` / `docs:dev` on developer machines only.
- **Mitigation:** Do not expose dev servers to untrusted networks; CI uses production builds only.

### Playwright (devDependency)

- **Issue:** Browser download and test harness — not shipped to consumers.
- **Mitigation:** CI installs browsers in isolated runners; no production surface.

## Runtime surface

Published package (`velo-plot` on npm):

- **No Node.js server** in library code — browser/WebGL chart engine only.
- **Peer dependencies** (React, Vue, etc.) are optional and consumer-controlled.
- **Data paths:** User data stays in-browser unless apps explicitly export/send it.

## Re-audit cadence

- Run `pnpm audit` on every **minor/major** release PR.
- Fail CI on **direct** `velo-plot` dependency vulnerabilities when patches exist.
- Transitive doc-tooling issues remain documented exceptions until upstream fixes land.

## Commands

```bash
pnpm audit
pnpm audit --audit-level=high
```
