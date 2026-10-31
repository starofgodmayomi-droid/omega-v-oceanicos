# `@omega-v/authorization`

Fail-closed authority and permission engine.

It produces the `authorityVerified` and `policySatisfied` evidence consumed by
the C4 admission gate. Every evaluation either matches an explicit grant or
returns `DENY`.

## Invariants

- **Fail closed** — no matching grant means denial, always.
- **Capability ≠ authority** — holding a capability never self-authorizes.
- **Signature ≠ authorization** — a signed request is evidence, not permission.
- Grants are scoped, expire, and are revocable.
- The engine never grants authority to itself (subject must differ from granter).

## API

```typescript
import { AuthorizationEngine } from '@omega-v/authorization';

const engine = new AuthorizationEngine();
const grant = engine.grant({
  subject: 'worker:alpha',
  scope: 'worker:test',
  policyRefs: ['c4-admission'],
  grantedBy: 'operator:ada',
});

engine.evaluate({
  changeId: 'chg-1',
  subject: 'worker:alpha',
  scope: 'worker:test',
  policyRefs: ['c4-admission'],
  evidence: ['attestation-1'],
});
// { authorized: true, authorityVerified: true, policySatisfied: true, ... }
```

`restore(grants)` rehydrates the ledger from durable storage, revocation state
included, so a restarted process still denies the subjects that were revoked.

## HTTP surface

Registered by `apps/api`: `POST /v1/authorization/grant`,
`POST /v1/authorization/evaluate`, `POST /v1/authorization/revoke`,
`GET /v1/authorization/grants`.

Grants and revocations are journaled to `OMEGA_GOVERNANCE_LOG_PATH` and replayed
on boot, so they survive an API restart. Responses carry `durable`: `true` when
the record reached the journal, `false` when it was accepted in memory only.
