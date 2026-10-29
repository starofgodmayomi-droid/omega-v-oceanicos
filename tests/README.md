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
pnpm test              # everything
pnpm test:coverage     # with the 70% threshold enforced
pnpm test:watch        # watch mode
```

## What is verified beyond the suite

The CI `docker` job builds the image and exercises a running container: it
must refuse to start without `OMEGA_SIGNING_KEY`, then serve `/health`,
`/rules`, `/complete-loop`, `/log`, the same routes under `/api`, and the web
client at `/`. Passing tests proved the code runs under a test runner; that
job is what proves the artifact runs.

## Known gaps

- `apps/web/src/App.tsx` is excluded from the coverage denominator. Covering it
  needs jsdom and a component testing setup that does not exist here. The
  exclusion is explicit in `jest.config.js` so the reported percentage is not
  read as covering more than it does.
- Five files here are not run by any command, because they predate the current
  architecture: `full-loop` and `broken-current` drive the removed
  `/complete-loop` and `/log` routes, `mini-kernel` and `verification_loop`
  import the pre-rename `@omega-v/*` package names under jest globals, and
  `fullstack_e2e` imports 60+ names that are not workspace members at all.
  `tests/integration/e2e-suite-contract.integration.test.ts` names each one
  with its reason, so the list of unrun suites cannot grow silently; read them
  as history, not as coverage.

---

## Whole-ecosystem alignment

This repository surface is one bounded form in the OCEANICOS body, rooted in human intent and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY → finite Δ` and the full-stack transition loop is defined by the [Whole-Ecosystem Master Prompt](../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that a named component exists, connects, runs, or is healthy. This README documents this surface; establish claims from relevant implementation, tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability is not authority, and execution is not verification.
