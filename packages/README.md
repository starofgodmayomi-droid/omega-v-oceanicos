# Packages

Shared libraries for the Ω∞v growth spine:

```text
0 → MINI (👁 → ✓ → 🧠) → earned +expansions → continuum subsystems
```

## MINI kernel

```text
💧 Ω∞v MINI ::= 👁 Observe → ✓ Verify → 🧠 Remember
```

```
packages/
├── types/              # Shared contracts
├── observer/           # 👁 Capture and normalize observations
├── verification/       # ✓ Apply rules and generate evidence
├── remember/           # 🧠 Append-only hash-chained memory
└── mini/               # 💧 Compose one living cycle
```

| Package                 | Role                         |
| ----------------------- | ---------------------------- |
| `@omega-v/types`        | Zero-dependency shared types |
| `@omega-v/observer`     | Step 1 — observe             |
| `@omega-v/verification` | Step 2 — verify              |
| `@omega-v/remember`     | Step 3 — remember            |
| `@omega-v/mini`         | Kernel composition           |

### Quick start (MINI only)

```typescript
import { MiniKernel } from '@omega-v/mini';

const mini = new MiniKernel({ rules: [/* VerificationRule */] });
const { observation, verification, memory } = mini.cycle({
  claim: 'Service healthy',
  category: 'health-check',
  source: { system: 'api', version: '1.0.0', environment: 'test' },
  observedBy: 'dev',
  metadata: { statusCode: 200, responseTime: 40 },
  confidence: 0.95,
  confidenceReason: 'checks passed',
});
```

## Earned expansions & ecosystem subsystems

These packages expand MINI across attestation, consensus, cognition, and vector memory:

```
packages/
├── attestation/        # + ATTEST — cryptographic signing
├── generative/         # + GENERATIVE — media bridge
├── inference/          # + INFERENCE — live model client
├── mood/               # + MOOD — state resonance
├── pluralism/          # + PLURALISM — consensus matrix
└── vector/             # + VECTOR — semantic recall
```

| Package                 | Expansion / Subsystem                           |
| ----------------------- | ----------------------------------------------- |
| `@omega-v/attestation`  | `+ ATTEST` — signatures others can check        |
| `@omega-v/generative`   | `+ GENERATIVE` — deterministic generative media |
| `@omega-v/inference`    | `+ INFERENCE` — local LLM intelligence client   |
| `@omega-v/mood`         | `+ MOOD` — liquid state resonance               |
| `@omega-v/pluralism`    | `+ PLURALISM` — multi-perspective consensus     |
| `@omega-v/vector`       | `+ VECTOR` — dense semantic vector memory       |

Apps (`apps/api`, `apps/web`) are interface expansions (`+ API`, `+ Web`).

## Installation

### From monorepo

```bash
pnpm install
pnpm --filter @omega-v/mini build
pnpm test -- packages/mini packages/remember
```

### Mental model

1. Prefer `@omega-v/mini` for the default runtime unit
2. Use observer / verification / remember directly when testing a single leg
3. Reach for attestation/API/web only when the expansion is intentionally in scope

## Testing

Each package includes unit tests. Kernel tests live in `tests/unit/omega-kernel.test.ts`.

Coverage thresholds are enforced globally via root Jest config.

## Versioning

Semantic versioning. Current: **0.1.0** (MINI establishing).

---

**Status:** MINI kernel establishing  
**Last Updated:** 2026-09-16  
**See also:** [docs/MINI.md](../docs/MINI.md)
