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
