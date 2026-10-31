# tests/api — API suites on `node:test`

These files replace every Jest suite that used to live in
`apps/api/src/__tests__/` (99 tests in total). They run with the repository's
single runner:

```bash
pnpm build && node --experimental-strip-types --test ./tests/api/*.test.ts
```

`pnpm test` and `pnpm test:coverage` include this directory.

## Why they moved

- `apps/api` never declared a Jest runner, and CI only runs `pnpm test`
  (`node:test`). The Jest files therefore never executed anywhere.
- Most of them were written against the removed Express surface
  (`import app from '../index'`, `createServer(app)`, routes such as
  `/complete-loop`, `/memory`, `/act`, `/audit/events`). They could not load
  against the current Fastify module (`createApp`), which has no default
  export, and several asserted endpoints absent from
  `apps/api/src/route-contract.ts`.
- Two asserted labels the code no longer produces (`CONVERGED_PLURAL`,
  pipeline stage `OBSERVE`), so they would have failed had they ever run.

Converting exposed two real defects, both fixed in this pass:

| Defect | Fix |
| --- | --- |
| `apps/api/src/scene.ts` imported its runtime guard `validateSceneInput` under `import type` **and** from the wrong package (`@omega-v/types`, which is named `@oceanicos/types`), so every `simulateScene` call threw and `tsc` never saw the file because nothing imports it. | Value import from `@oceanicos/types`. |
| `apps/api/src/__tests__/documentation.test.ts` scanned `app.get(...)` (Express) and checked nothing. | `documentation.test.ts` here asserts the README advertises no route outside the executable inventory — the drift it was written to catch. |

## Retired, not converted

Deleted because they tested a surface that no longer exists (Express app,
removed routes) or duplicated node coverage:

`api.test.ts`, `api.loop.test.ts`, `api.memory.test.ts`, `api.prefix.test.ts`,
`api.validation.test.ts`, `api.auth-mode.test.ts`, `api.dissensus.test.ts`,
`api.ed25519.test.ts`, `api.ed25519-legacy-key.test.ts`,
`api.attestation-ttl.test.ts`, `api.observability-encrypted.test.ts`,
`api.revocation-mismatch.test.ts`, `api.route-catch-genuine-errors.test.ts`,
`api.state-attestation-tamper.test.ts`, `api.memory-integrity-degraded.test.ts`,
`jobs.api.test.ts`, `persistence.crossrealm-errors.test.ts` (the file's own
header says it exists only to work around Jest's vm realm), `api.pipeline.test.ts`
and `route-inventory.test.ts` (already covered by
`tests/integration/api-pipeline-causal.integration.test.ts` and
`tests/integration/api-route-contract.integration.test.ts`).

## Converted live module suites

- `jobs.test.ts` — 23 tests for `LocalJobLedger` (idempotency, claim
  ownership, encrypted storage, tamper and restore rejection).
- `persistence.test.ts` — 65 tests for snapshot/event-log persistence,
  rotation, re-encryption journals, and policy parsers. Asymmetric Jest
  matchers (`expect.objectContaining` / `arrayContaining`) have no
  `node:assert` equivalent, so surface rows are compared field by field.

`apps/api/src/__tests__/` no longer exists: every Jest suite there was either
converted here or retired above.

## Whole-ecosystem alignment

This repository surface is one bounded form in the OCEANICOS body, rooted in human intent and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY → finite Δ` and the full-stack transition loop is defined by the [Whole-Ecosystem Master Prompt](../../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that a named component exists, connects, runs, or is healthy. This README documents this surface; establish claims from relevant implementation, tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability is not authority, and execution is not verification.
