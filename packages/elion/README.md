# @oceanicos/elion

**ELION — the Hands** of the Ω∞v body: bounded execution under explicit authority.

```text
HUMAN AUTHORITY + ADMISSION + SCOPE → RUN → EXECUTED_NOT_VERIFIED
anything missing                    → NOT_EXECUTED
```

## What it does

`executeBoundedAction(plan, authorization)` runs one `ElionPlan` and returns an
`ElionExecution`. It refuses, without running the handler, when:

- `authorizedBy` is empty — human authority is final;
- `admitted` is not exactly `true` — the bounded gate has to admit the plan;
- `scope` is empty — authority is never open-ended.

A handler that throws is reported as `NOT_EXECUTED` with the thrown message. A handler that
returns is reported as `EXECUTED_NOT_VERIFIED`.

## Invariants

- `verification` is always `'PENDING_OMEGA'`. ELION never issues a verdict, so running the
  work can never be confused with proving it succeeded.
- A refusal leaves `output` undefined; there is no partial success state.
- The execution record keeps the authorizing person and the scope, so later verification
  can check that the authority covered the action.

## Usage

```typescript
import { executeBoundedAction } from '@oceanicos/elion';

const execution = await executeBoundedAction(
  { id: 'probe:health', description: 'read the health endpoint', run: () => fetchHealth() },
  { authorizedBy: 'operator', admitted: true, scope: 'read-only probe' }
);

execution.status; // 'EXECUTED_NOT_VERIFIED' | 'NOT_EXECUTED'
```

## Status

Unit-tested organ. `apps/api` does not import it yet; that wiring is a separate,
authorized change. See [ECOSYSTEM_BODY.md](../../ECOSYSTEM_BODY.md).

## Test

```bash
pnpm --filter @oceanicos/elion test
```

The organ is also exercised end to end through the API's ecosystem body (`node --experimental-strip-types --test ./tests/api/ecosystem-body.test.ts`).

## Whole-ecosystem alignment

This repository surface is one bounded form in the OCEANICOS body, rooted in human intent and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY → finite Δ` and the full-stack transition loop is defined by the [Whole-Ecosystem Master Prompt](../../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that a named component exists, connects, runs, or is healthy. This README documents this surface; establish claims from relevant implementation, tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability is not authority, and execution is not verification.
