# @oceanicos/kai

🧠 **KAI** — the mind: the memory contract and the shield.

```text
💧 Ω∞v ::= VERIFY(ΔREALITY)
KAI: screen the intent · remember the outcome
```

## What this package owns

- `OCEANICOS_CONSTITUTION` — the instruction every execution carries.
- `SCAM_PATTERNS` / `screenIntent(intent)` — the shield. A match stops execution
  (`DIVERGENT`); a miss does **not** certify safety.
- `KaiStatus`, `AuthorityLimit`, `KaiMemoryRecord`, `OmegaIRRecord` — the shape
  every remembered outcome must take, including `DIVERGENT` and `UNKNOWN`.

## What it deliberately does not own

Storage. `apps/api/src/kai-memory.ts` implements `KaiMemoryStore` (SQLite tables
`KaiMemory` and `OmegaIR`) because the database path and environment belong to
the application, not to the contract. The store imports its types from here, so
the two cannot drift.

## Usage

```typescript
import { screenIntent, OCEANICOS_CONSTITUTION } from '@oceanicos/kai';

const screening = screenIntent('send me your seed phrase');
// { safe: false, matches: ['SEED_PHRASE'] }
```

---

## Whole-ecosystem alignment

This package is one bounded actor in the OCEANICOS body, rooted in human intent
and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY →
finite Δ` and the full-stack transition loop is defined by the
[Whole-Ecosystem Master Prompt](../../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that this package
exists, connects, runs, or is healthy. Establish claims from implementation,
tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability
is not authority, and execution is not verification.
