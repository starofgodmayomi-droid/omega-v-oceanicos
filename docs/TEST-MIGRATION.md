# Test migration ledger — Jest → `node:test`

This repository carries two test runners. The one that executes is the **node
suite**:

```bash
node --experimental-strip-types --test-concurrency=1 --test ./tests/integration/<file>
```

`pnpm test` runs it after `pnpm build` (plus `pnpm test:web`, which uses the
Jest copy vendored inside `apps/web`). Jest is **not installed** at the repo
root or in `apps/api` — `pnpm exec jest` reports `Command "jest" not found`, and
`node_modules/.bin` has no `jest` entry. Every suite under
`apps/api/src/__tests__/` and every per-package `jest.config.*` therefore
records a contract nobody executes. That is the "stale Jest" problem.

```text
FILE EXISTS            ≠ RUNNER INSTALLED
RUNNER INSTALLED       ≠ SUITE EXECUTED IN CI
ASSERTION MIGRATED     ≠ BEHAVIOUR STILL TRUE   (the migration found three defects, below)
```

## Migrated in this pass (17 tests, all passing)

| Jest file (deleted) | Node suite file | Notes |
| --- | --- | --- |
| `apps/api/src/__tests__/api.prefix.test.ts` | `tests/integration/api-prefix.integration.test.ts` | Rewritten onto `app.inject`; the original route list (`/rules`, `/state`, `/events`, `/log`, `/memory`, `/complete-loop`) no longer exists, so cases now use live routes. |
| `apps/api/src/__tests__/ecosystem-body.test.ts` | `tests/integration/ecosystem-body.integration.test.ts` | `CONVERGED_PLURAL` → `CONVERGED_PASS` (the mesh layer's current verdict). |
| `apps/api/src/__tests__/mesh-validation.test.ts` | `tests/integration/mesh-validation.integration.test.ts` | Ported as-is. |
| `apps/api/src/__tests__/scene.test.ts` | `tests/integration/scene.integration.test.ts` | Imports `apps/api/src/scene.ts` from source — it is not reachable from the API entry point, so `tsc` never emits it to `dist`. |
| `apps/api/src/__tests__/documentation.test.ts` | `tests/integration/api-documentation-contract.integration.test.ts` | Now checks the README against `src/route-contract.ts` (the single source of truth) and the documented env vars. The startup-banner half was dropped: the banner it asserted on does not exist in `src/index.ts`. |

Deleted as a duplicate, not migrated:

| Jest file | Already covered by |
| --- | --- |
| `apps/api/src/__tests__/route-inventory.test.ts` | `tests/integration/api-route-contract.integration.test.ts` (same inventory, plus malformed/duplicate contract checks) |

### Defects the migration surfaced

1. **`/api/*` was 404 on the API itself.** The prefix existed only as a Vite
   dev-server rewrite, so a built bundle calling `/api/*` had nothing answering.
   Fixed in `apps/api/src/index.ts` (`rewriteApiPrefix` + Fastify `rewriteUrl`);
   `/api` maps to root and `/apiary` is untouched.
2. **`apps/api/src/scene.ts` could not run at all.** `validateSceneInput` was
   imported with `import type` and then called (a `ReferenceError` at runtime),
   and it was imported from `@omega-v/types`, which `apps/api` does not depend
   on. Both fixed; the module is still unused by any route, so it stays out of
   `dist`.
3. **`apps/api/README.md` documented 34 of 73 routes.** The migration added an
   "Executable route inventory" table generated from `src/route-contract.ts`
   and the missing `OMEGA_SIGNING_KEY` note.

## Still stale — `NOT_EXECUTED`, Jest not installed

These files remain under `apps/api/src/__tests__/`. None of them has been
executed in this workspace, so none of their claims is evidence yet. Each needs
the same treatment: port to `tests/integration/*.integration.test.ts` against
`createApp()` from `apps/api/dist/index.js`, then delete the Jest copy.

| File | Jest-only surface it relies on |
| --- | --- |
| `api.test.ts` (42 tests) | `jest.resetModules` to re-require the app per env |
| `persistence.test.ts` (65 tests) | `jest.resetModules`, `jest.mock` |
| `jobs.test.ts` (23), `jobs.api.test.ts` (19) | `jest.resetModules`, timers |
| `api.loop.test.ts` (15) | `jest.Mock` |
| `api.validation.test.ts` (21) | — (plain assertions: cheapest to port next) |
| `api.dissensus.test.ts` (10) | — |
| `api.auth-mode.test.ts` (6) | `jest.resetModules` |
| `api.memory.test.ts` (5), `api.observability-encrypted.test.ts` (5) | `jest.resetModules` |
| `api.pipeline.test.ts` (4), `persistence.crossrealm-errors.test.ts` (4) | — |
| `api.ed25519.test.ts` (3), `api.revocation-mismatch.test.ts` (3) | — |
| `api.attestation-ttl.test.ts` (2), `api.ed25519-legacy-key.test.ts` (2) | — |
| `api.memory-integrity-degraded.test.ts` (2), `api.route-catch-genuine-errors.test.ts` (2) | `jest.resetModules` |
| `api.state-attestation-tamper.test.ts` (1) | `jest.resetModules` |

The `jest.resetModules` files re-import the app under different environment
variables. `createApp(dbPath, logger, options)` already takes the knobs those
tests needed (`allowUnsignedCycle`, `attestationSigningKey`), so most of them
become plain `createApp(...)` calls with an explicit option rather than a module
cache reset.

### Elsewhere

- `apps/web/src/__tests__/dom/`: `test:current-dom` runs `CurrentAppShell`,
  `ConnectorPanel` and `SingleBodyPanel`. `App.test.tsx`,
  `act-async-wrapper.test.tsx` and `runtime-health-panel.test.tsx` are runnable
  (the Jest copy ships inside `apps/web/node_modules`) but no script runs them.
- `packages/*/src/__tests__/`: per-package Jest configs with no installed
  runner. Nothing here executes them.

## Adding a test

Put it in `tests/integration/`, import from `apps/api/dist/index.js` (built by
`pnpm build`), and add the path to the `test` script in `package.json`.
