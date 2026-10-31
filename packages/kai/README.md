# @oceanicos/kai

**KAI — the Mind** of the Ω∞v body: continuity memory, bounded recall, and the Shield.

```text
REMEMBER → RECALL → SHIELD
```

## What it does

| Surface | Behaviour |
| --- | --- |
| `KaiMind.remember(input)` | Records one append-only drop. Status comes from the observed evidence status (`PASS` → `VERIFIED`, `FAIL`/`DIVERGENT` → `DIVERGENT`, `NOT_EXECUTED`, anything else → `UNKNOWN`). |
| `KaiMind.recall(query)` | Returns only drops whose claim or source contains the query; an empty query returns nothing. |
| `KaiMind.shield(intent)` | Names scam signals in text: `DECISIVE` → `BLOCK`, `CAUTION` only → `REVIEW`, empty text → `UNKNOWN`, otherwise `ALLOW`. |

## Invariants

- Every drop carries `memoryIsProof: false`, typed literally, so memory cannot be upgraded
  into proof by a caller.
- `authority` is `'human_and_reality'`; a drop never grants permission.
- The Shield is a bounded text check. `ALLOW` means *no decisive scam signal was observed
  in this text*, not that the counterparty is trustworthy. `endorsement` is typed `false`.
- Missing evidence status or source is preserved as `UNKNOWN` with the reason recorded in
  `unknowns`.

## Usage

```typescript
import { KaiMind } from '@oceanicos/kai';

const kai = new KaiMind();
const drop = kai.remember({
  claim: 'API health check returned 200',
  evidence: { status: 'PASS', source: 'curl http://localhost:5000/health' },
});

kai.recall('health');                 // [drop]
kai.shield('send your seed phrase');  // { decision: 'BLOCK', ... }
```

## Status

Unit-tested organ. `apps/api` does not import it yet; that wiring is a separate,
authorized change. See [ECOSYSTEM_BODY.md](../../ECOSYSTEM_BODY.md).

## Test

```bash
pnpm --filter @oceanicos/kai test
```

The organ is also exercised end to end through the API's ecosystem body (`node --experimental-strip-types --test ./tests/api/ecosystem-body.test.ts`).

## Whole-ecosystem alignment

This repository surface is one bounded form in the OCEANICOS body, rooted in human intent and source context. Its place in `SOURCE → ROOT → SUCCESS → relevant BODY → finite Δ` and the full-stack transition loop is defined by the [Whole-Ecosystem Master Prompt](../../WHOLE-ECOSYSTEM-MASTER-PROMPT.md).

The prompt is a design/continuity contract, not evidence that a named component exists, connects, runs, or is healthy. This README documents this surface; establish claims from relevant implementation, tests, and observations. Keep `UNKNOWN` and `DIVERGENT` explicit; capability is not authority, and execution is not verification.
