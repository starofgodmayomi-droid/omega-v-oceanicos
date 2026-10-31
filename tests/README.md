# Tests

## Source-level documentation guard

`pnpm validate:docs` checks that every tracked README links to the root whole-ecosystem master prompt, uses the shared source-to-root alignment contract, and keeps the former prompt path as a working compatibility pointer. CI runs this dependency-free check on Linux and Windows. It validates documentation structure and links, not subsystem runtime behavior.

## Where the tests are

Beside the code they test, in `src/__tests__/` within each package and app.
Beside them, this directory holds the cross-package integration suite and the
guards that check the documentation against the code.

`tests/integration/` is the cross-package suite: it drives the Fastify app
through `createApp` from `apps/api/dist`, or the workspace packages from their
own `dist`, and asserts the evidence each one returns. Several files read a
subsystem back through a different code path than the one that wrote it — a
system can agree with itself and still be wrong.

The suite is collected by `scripts/run-node-suite.mjs`, which reads the files
on disk. Adding a `*.test.ts` file there (or in `apps/web/src/__tests__/`) is
all it takes to be part of `pnpm test`; nothing has to be registered.

| Suite                                  | Covers                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `packages/observer/src/__tests__/`     | capture, normalization, deduplication, validation                       |
| `packages/verification/src/__tests__/` | rule registry, applicability, evidence paths, caching                   |
| `packages/attestation/src/__tests__/`  | HMAC signing, verification, key handling, rotation                      |
| `packages/remember/src/__tests__/`     | hash chain, durable store, tamper and deletion detection                |
| `packages/mini/src/__tests__/`         | the kernel cycle, component injection, restart resumption               |
| `apps/web/src/__tests__/`              | client/API contract, evidence labels, the browser attestation verifier   |
| `apps/web/src/__tests__/dom/`          | jsdom component suites (Jest; needs JSX, which node cannot strip)       |
| `tests/integration/`                   | cross-package and API route contracts, run by the node suite            |

## Running them

```bash
pnpm test              # build, DOM suites (Jest), then the node suite
pnpm test:web          # the jsdom component suites only
pnpm test:coverage     # integration suite with the coverage threshold enforced
node scripts/run-node-suite.mjs   # the node suite against already-built dist
```

A single integration file:

```bash
node --experimental-strip-types --test ./tests/integration/<file>.test.ts
```

## What is verified beyond the suite

The CI `docker` job builds the image and exercises a running container: it
must refuse to start without `OMEGA_SIGNING_KEY`, then serve `/health`,
`/rules`, `/complete-loop`, `/log`, the same routes under `/api`, and the web
client at `/`. Passing tests proved the code runs under a test runner; that
job is what proves the artifact runs.

## Known gaps

- `apps/web/src/App.tsx` is not in the node suite's coverage denominator: its
  behaviour belongs to the jsdom suites in `apps/web/src/__tests__/dom/`, which
  Jest measures separately.
- `tests/__tests__/` holds source and documentation guards written against
  Jest globals (only `asymmetric-attestation.test.ts` imports them). They are
  not part of `pnpm test` yet; converting them to `node:test` is outstanding.
- No `*.test.tsx` file can run in the node suite: node's type stripping does
  not transform JSX. Component behaviour goes through `pnpm test:web`.

---

## Whole-ecosystem alignment

This repository surface is one bounded form in the OCEANICOS body, rooted in human intent and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY → finite Δ` and the full-stack transition loop is defined by the [Whole-Ecosystem Master Prompt](../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that a named component exists, connects, runs, or is healthy. This README documents this surface; establish claims from relevant implementation, tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability is not authority, and execution is not verification.
