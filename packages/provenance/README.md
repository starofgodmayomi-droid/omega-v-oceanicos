# `@omega-v/provenance` (C7)

Append-only, hash-chained lineage ledger.

Each entry records where a change came from, who it is attributed to, and the
sequence that led to it, cryptographically linked to the entry before it. Any
edit to history breaks the linkage, so `verifyIntegrity()` reports tampering
instead of hiding it.

## Invariants

- History is immutable: entries are never edited or deleted.
- Corrections append a new entry; they do not rewrite an old one.
- Provenance is evidence of lineage, not proof of correctness.

## API

```typescript
import { ProvenanceChain } from '@omega-v/provenance';

const chain = new ProvenanceChain();
const entry = chain.append('chg-1', 'api:/v1/cycle', 'operator', ['compile:ok']);
chain.verifyIntegrity(); // true while the chain is intact
```

`restore(entries)` rehydrates a chain from durable storage. Entries keep their
recorded hashes, ids and timestamps, so the chain continues rather than forking.
It is not a repair path: `verifyIntegrity()` re-checks every hash and link, so a
tampered journal reports `false` instead of being rebuilt.

## HTTP surface

Registered by `apps/api`: `POST /v1/provenance/append`, `GET /v1/provenance/verify`,
`GET /v1/provenance/lineage/:changeId`, `GET /v1/provenance/tip`.

The API journals each append to `OMEGA_GOVERNANCE_LOG_PATH` and replays it on
boot, so a restart resumes the same chain. Responses carry `durable`: `true` when
the entry reached the journal, `false` when it was accepted in memory only
(`OMEGA_PERSISTENCE=off`, a `:memory:` database, or an unwritable path). The file
is single-host — not a distributed log.
