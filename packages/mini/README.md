# @omega-v/mini

💧 **Ω∞v MINI** — the first living system.

```text
0
│
▼
💧 Ω∞v MINI ::= 👁 Observe → ✓ Verify → 🧠 Remember
```

## Origin

Architecture does **not** begin as a giant ecosystem.

- **Zero** — no assumed capital, stack, or trust
- **MINI** — the smallest useful kernel
- **Expansion** — each `+` is earned by the previous layer

## Usage

```typescript
import { MiniKernel } from '@omega-v/mini';

const mini = new MiniKernel({
  rules: [/* VerificationRule[] */],
});

const result = mini.cycle({
  claim: 'Service X is healthy',
  category: 'health-check',
  source: { system: 'api', version: '1.0.0', environment: 'prod' },
  observedBy: 'monitor',
  metadata: { statusCode: 200, responseTime: 40 },
  confidence: 0.95,
  confidenceReason: 'consecutive checks',
});

// result.observation
// result.verification
// result.memory
```

## Composition

| Layer       | Package                 | Role                       |
| ----------- | ----------------------- | -------------------------- |
| 👁 Observe   | `@omega-v/observer`     | Capture + normalize claims |
| ✓ Verify    | `@omega-v/verification` | Rules + evidence paths     |
| 🧠 Remember | `@omega-v/remember`     | Append-only durable memory |
| 💧 MINI     | `@omega-v/mini`         | Compose the three          |

## Earned expansions (not MINI)

Only after MINI is real and verified:

`+ Reason · + Intent · + Build · + Test · + Attest · + Act · + Full Stack · + Ecosystem`

Attestation (`@omega-v/attestation`), API, Web, and infra are expansions — not prerequisites.

## Value Navigator adapter

`createValueNavigatorProposal` creates an `OmegaChangeRecord` with
`decision: REVIEW`, `authorized: false`, and `NOT_EXECUTED`. The read-only
observation adapter appends a superseding record and reconciles a submitted
outcome as `VERIFIED`, `DIVERGENT`, or `UNKNOWN`. `FileValueNavigatorStore`
persists those records in a local append-only, hash-chained JSONL journal with
bounded text/evidence and record counts. A match verifies only the stated
hypothesis against the supplied observation; it does not prove demand, revenue,
execution, external truth, deployment, or health.

## Connector observation

`admitOmegaConnector` remains a non-executing admission boundary.
`executeAdmittedConnector` invokes an explicit handler only after admission
succeeds. `observeAdmittedConnector` reconciles the declared expected
observation against a supplied actual observation as `VERIFIED`, `DIVERGENT`,
`UNKNOWN`, or `NOT_EXECUTED`. No handler is inferred. Unadmitted connectors
cannot become `VERIFIED`. A match verifies only the admitted observation
receipt; it does not prove deployment, revenue, secret custody, or an
undeclared network call.
