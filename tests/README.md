# Tests

## Source-level documentation guard

`pnpm validate:docs` checks that every tracked README links to the root whole-ecosystem master prompt, uses the shared source-to-root alignment contract, and keeps the former prompt path as a working compatibility pointer. CI runs this dependency-free check on Linux and Windows. It validates documentation structure and links, not subsystem runtime behavior.

## Where the tests are

Beside the code they test, in `src/__tests__/` within each package and app.
Beside them, this directory holds the cross-package integration suite and the
guards that check the documentation against the code.

`tests/integration/full-loop.integration.test.ts` runs the API with durability
switched on, drives it over HTTP, then reads what it wrote back out using
`packages/remember` and `packages/attestation` directly rather than the API's
own accessors. A system can agree with itself and still be wrong; here the
writer and the reader are different code paths.

| Suite                                  | Covers                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `packages/observer/src/__tests__/`     | capture, normalization, deduplication, validation                       |
| `packages/verification/src/__tests__/` | rule registry, applicability, evidence paths, caching                   |
| `packages/attestation/src/__tests__/`  | HMAC signing, verification, key handling, rotation                      |
| `packages/remember/src/__tests__/`     | hash chain, durable store, tamper and deletion detection                |
| `packages/mini/src/__tests__/`         | the kernel cycle, component injection, restart resumption               |
| `apps/api/src/__tests__/`              | endpoints, validation guards, persistence, prefix parity, documentation |
| `apps/web/src/__tests__/`              | the client/API contract                                                 |

## Running them

```bash
pnpm test              # build, web suites, the node integration suite, then test:suites
pnpm test:suites       # the Jest-era suites, now on node:test
pnpm test:coverage     # with the 70% threshold enforced
```

## Jest-era suites on the node runner

The root Jest preset was never installed — `node_modules/.bin/jest` does not
exist — so every suite importing `@jest/globals` or `vitest` compiled nowhere
and ran never. `tests/support/jest-compat.mjs` keeps those assertions as
written: `describe`/`it` come from `node:test`, `expect` is a thin matcher
layer over `node:assert` (including `it.each`, asymmetric matchers, and
`jest.fn`). `jest.mock` / `jest.requireActual` / `jest.resetModules` are
deliberately absent — module-registry swapping has no honest `node:test`
equivalent.

Wired by `pnpm test:suites`: every `packages/mini/src/__tests__/*.test.ts`
suite (admission bridge, change calculus, compiler, connector admission and
observation, IR validator, KAI, KAI cycle, repo builder, repo verifier,
transition, water flow, worker registry) and the root documentation guards
that pass against the current tree.

Still not wired, each reporting pre-existing drift rather than a runner
problem: `brand` (docs/BRAND.md publishes an older palette than
`apps/web/src/tokens.css`), `docs-claims` (packages/apps without READMEs),
`governance` (admin-gated writes the governance doc does not list),
`portable-scripts` (root `test:coverage` still shells out to `rm -rf` /
`mkdir -p`, and the smoke test names `dist/server.js` where `scripts/smoke-api.cjs`
runs `dist/index.js`), `roadmap-claims`, and `node-support` (CI claims the
suites no longer make). `apps/api/src/__tests__` still imports
`@jest/globals` and needs a hand conversion per file.

## What is verified beyond the suite

The CI `docker` job builds the image and exercises a running container: it
must refuse to start without `OMEGA_SIGNING_KEY`, then serve `/health`,
`/rules`, `/complete-loop`, `/log`, the same routes under `/api`, and the web
client at `/`. Passing tests proved the code runs under a test runner; that
job is what proves the artifact runs.

## Known gaps

- The React DOM suites under `apps/web/src/__tests__/dom/` run through
  `apps/web`'s own Jest install (`pnpm test:web`), which is the only place Jest
  is actually installed. The root preset is not used.
- `pnpm test:integration` matches no tests, because this directory is empty.
  It passes rather than failing on an empty match, which is honest only for as
  long as this note stays next to it.

---

## Whole-ecosystem alignment

This repository surface is one bounded form in the OCEANICOS body, rooted in human intent and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY → finite Δ` and the full-stack transition loop is defined by the [Whole-Ecosystem Master Prompt](../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that a named component exists, connects, runs, or is healthy. This README documents this surface; establish claims from relevant implementation, tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability is not authority, and execution is not verification.
