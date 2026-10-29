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
