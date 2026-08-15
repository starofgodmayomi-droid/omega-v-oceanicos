# Packages

Shared libraries for the Ω∞v growth spine:

```text
0 → MINI (👁 → ✓ → 🧠) → earned +expansions
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

| Package | Role |
|---------|------|
| `@omega-v/types` | Zero-dependency shared types |
| `@omega-v/observer` | Step 1 — observe |
| `@omega-v/verification` | Step 2 — verify |
| `@omega-v/remember` | Step 3 — remember |
| `@omega-v/mini` | Kernel composition |

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

## Earned expansions

These packages are **not** the kernel. They expand MINI when earned:

```
packages/
└── attestation/        # + ATTEST — cryptographic signing
```

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

## Development

### Add a New Package

Only add a package when the previous layer has evidence it works.

```bash
mkdir packages/my-package
# package.json name: @omega-v/my-package
```

Wire:

1. `package.json` scripts (`build`, `clean`)
2. Root `package.json` build order if needed
3. `jest.config.js` + root `tsconfig.json` path mappings
4. README stating whether it is MINI or an earned `+`

## Testing

Each MINI package includes unit tests. Kernel tests live in `packages/mini`.

Coverage thresholds are enforced globally via root Jest config.

## Versioning

Semantic versioning. Current: **0.1.0** (MINI establishing).

---

**Status:** MINI kernel establishing  
**Last Updated:** 2026-08-14  
**See also:** [docs/MINI.md](../docs/MINI.md)
