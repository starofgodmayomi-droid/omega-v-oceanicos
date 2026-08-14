# @omega-v/memory

Append-only, hash-chained provenance memory for Ω∞v Oceanicos.

**Step 4 of the mini kernel**: OBSERVER + VERIFIER + EVIDENCE + **MEMORY**.
Nothing is deleted; every recorded entry is linked to its predecessor so tampering with history is detectable.

## Installation

```bash
npm install @omega-v/memory
```

## Usage

```typescript
import { Memory } from '@omega-v/memory';

const memory = new Memory();

// Record each step of the verification loop
memory.record('OBSERVATION', observation);
memory.record('VERIFICATION', verificationResult);
memory.record('ATTESTATION', attestation);

// Prove the history has not been altered
const intact = memory.verifyIntegrity(); // true

// Query the provenance trail
const attestations = memory.query('ATTESTATION');
const latest = memory.latest();
```

## Features

### Append-Only Recording
Every event is stored in insertion order with a sequential ID. The log can never be edited or truncated through the public API — entries returned to callers are copies.

### Hash-Chained Integrity
Each entry's SHA-256 hash covers its id, type, data, timestamp, and the hash of the previous entry. Altering, removing, or reordering any entry breaks the chain and is detected by `verifyIntegrity()` / `Memory.verifyChain()`.

### Rehydration
A persisted chain can be loaded into a new `Memory` instance. The constructor refuses to load a history that fails its integrity check.

## API

### Constructor

```typescript
new Memory(existingEntries?: EventLogEntry[])
```

- `existingEntries` — Previously recorded entries to rehydrate from (default: `[]`). Throws if the chain fails verification.

### Methods

#### `record(type, data)`

Append an event to the log.

**Parameters:**
```typescript
type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION'
data: Observation | VerificationResult | Attestation
```

**Returns:** `EventLogEntry` (with `id`, `recordedAt`, `hash`, `previousHash`)

#### `verifyIntegrity()`

Recompute every hash and confirm each entry links to its predecessor.

**Returns:** `boolean`

#### `query(type?)`

Read entries, optionally filtered by event type, oldest first.

**Returns:** `EventLogEntry[]`

#### `latest()`

Return the most recently recorded entry, or `undefined` when empty.

#### `size()`

Return the number of recorded entries.

#### `Memory.verifyChain(entries)` (static)

Verify the integrity of any entry chain, e.g. one loaded from disk.

**Returns:** `boolean`

## Testing

```bash
npm test
```

---

**Package Status:** Alpha (v0.1.0)
**Part of:** Ω∞v Oceanicos mini kernel (OBSERVER + VERIFIER + EVIDENCE + MEMORY)
**Next:** Durable persistence adapter
**Last Updated:** 2026-08-14
