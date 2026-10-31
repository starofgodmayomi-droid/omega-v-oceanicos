# Tests

## Source-level documentation guard

`pnpm validate:docs` checks that every tracked README links to the root whole-ecosystem master prompt, uses the shared source-to-root alignment contract, and keeps the former prompt path as a working compatibility pointer. CI runs this dependency-free check on Linux and Windows. It validates documentation structure and links, not subsystem runtime behavior.

## Where the tests are

Beside the code they test, in `src/__tests__/` within each package and app.
Beside them, this directory holds the cross-package integration suite, the
repo-level contract suites, and the shared harnesses.

| Suite                              | Covers                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `packages/*/src/__tests__/`        | each library's own unit surface; run per package with `pnpm --filter`    |
| `apps/api/src/__tests__/`          | endpoints, validation guards, persistence, prefix parity                 |
| `apps/web/src/__tests__/`          | client/API contract, attestation verifier, dashboard model projections   |
| `apps/web/src/__tests__/dom/`      | rendered panels under jest + jsdom                                       |
| `tests/__tests__/`                 | repository contracts: brand, docs, skills, governance, supply chain      |
| `tests/integration/`               | the API driven end to end over HTTP                                      |
| `tests/harness/jest-compat.ts`     | a strict Jest-compatible facade so Jest-era suites run under node:test   |
| `tests/harness/api-routes.ts`      | the route inventory both contract suites compare against                 |

## Running them

```bash
pnpm test            # build, web DOM gate, then the node gate (one file at a time)
pnpm test:e2e        # the same gate, named for CI
pnpm test:web        # only the jest DOM suites
pnpm test:coverage   # the integration subset with coverage
```

The node gate is an explicit file list in the root package.json: Node's `--test`
discovers nothing here and accepts no path filter, so a suite that is not in
that list runs nowhere. `tests/integration/e2e-suite-contract.integration.test.ts`
holds every integration file, every `tests/__tests__` suite, and every web
suite to that rule, and keeps `test` and `test:e2e` from drifting apart.

## What is verified beyond the suite

The CI `docker` job builds the image and exercises a running container: it
must refuse to start without `OMEGA_SIGNING_KEY`, then serve `/health`, reject
an unauthenticated tip read, serve the authenticated tip and the ecosystem
body, refuse caller-supplied pipeline admission evidence, run a cycle the
stream reports as `TIP` / `BLOCK_MINTED`, and leave the ledger untouched for a
denied pipeline. Passing tests proved the code runs under a test runner; that
job is what proves the artifact runs.

## Known gaps

- The repo-level contract suites were written for Jest and no command ran
  jest: the root config named them, `jest` was not a root dependency, and the
  config could not start. They now import `tests/harness/jest-compat.ts` and
  run in the node gate. A facade, not a Jest reimplementation: only the
  matchers those suites use exist, and each is built on `node:assert/strict`.
- `apps/api/src/__tests__/` and most `packages/*/src/__tests__/` are still
  written against Jest globals. A few packages (for example `@omega-v/mood`)
  run them per package; others declare a `test: jest` script with no jest
  linked, so the script fails. They are not in the root gate, and the parked
  `tests/__tests__` entries are named in the suite contract with their reason.
- `docs/GOVERNANCE.md` still inventories the pre-`/v1` write surface, so
  `tests/__tests__/governance.test.ts` is parked until the document is
  rewritten against the routes the API registers. It is a governance
  decision, not a test migration.
- Two DOM suites, `App.test.tsx` and `runtime-health-panel.test.tsx`, drive the
  removed Builder-kernel shell; they are named in the suite contract with that
  reason. `CurrentAppShell.test.tsx` and the panel suites cover what replaced
  it.
- Five integration files are not run by any command because they predate the
  current architecture: `full-loop` and `broken-current` drive the removed
  `/complete-loop` and `/log` routes, `mini-kernel` and `verification_loop`
  import the pre-rename `@omega-v/*` package names under jest globals, and
  `fullstack_e2e` imports 60+ names that are not workspace members at all.
  The suite contract names each one with its reason, so the list of unrun
  suites cannot grow silently; read them as history, not as coverage.

---

## Whole-ecosystem alignment

This repository surface is one bounded form in the OCEANICOS body, rooted in human intent and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY → finite Δ` and the full-stack transition loop is defined by the [Whole-Ecosystem Master Prompt](../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that a named component exists, connects, runs, or is healthy. This README documents this surface; establish claims from relevant implementation, tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability is not authority, and execution is not verification.
