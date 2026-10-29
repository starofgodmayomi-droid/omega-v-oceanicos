# @oceanicos/omega

**OMEGA — the Judge** of the Ω∞v body: expected vs. observed reconciliation that fails
closed.

```text
no observation         → UNKNOWN
observation, no source → UNKNOWN
different values       → DIVERGENT (differences named)
equal values + source  → VERIFIED  (bounded to this comparison)
```

## What it does

`reconcile(expected, observation)` returns an `OmegaReconciliation` with a verdict, the
named differences, the reasons, and `allow`. `omegaGate(verdict)` opens only for
`VERIFIED`.

## Invariants

- Missing observation is `UNKNOWN`, never a pass.
- An observation without a non-empty `source` is `UNKNOWN`: a caller echo carries no
  provenance and cannot verify itself.
- Object comparisons name the differing keys; the reasoning is readable by a person.
- `VERIFIED` describes one comparison. It is not a claim that reality agrees, and it does
  not authorize a consequential action on its own.

## Usage

```typescript
import { reconcile } from '@oceanicos/omega';

reconcile(
  { status: 'ok', port: 5000 },
  { value: { status: 'ok', port: 5000 }, source: 'curl http://localhost:5000/health' }
);
// { verdict: 'VERIFIED', allow: true, differences: [], ... }
```

## Status

Unit-tested organ. `apps/api` does not import it yet; that wiring is a separate,
authorized change. See [ECOSYSTEM_BODY.md](../../ECOSYSTEM_BODY.md).

## Test

```bash
pnpm --filter @oceanicos/omega test
```
