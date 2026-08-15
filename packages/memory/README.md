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

### Durable persistence

Pass `persistPath` to survive restarts. The chain is written to a JSON-lines
file after every record (atomically, via temp file + rename) and reloaded —
integrity-checked — on startup. A tampered or truncated file is refused.

```typescript
const memory = new Memory({ persistPath: '/var/lib/omega-v/memory.jsonl' });

memory.record('OBSERVATION', observation);
// process restarts…
const restored = new Memory({ persistPath: '/var/lib/omega-v/memory.jsonl' });
restored.size(); // 1 — the chain continued where it left off
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
new Memory(options?: MemoryOptions)
```

- `existingEntries` — Previously recorded entries to rehydrate from (default: `[]`). Throws if the chain fails verification.
- `options.existingEntries` — Same as the array overload; takes precedence over the persisted file when both are given.
- `options.persistPath` — Path of a JSON-lines file the chain is persisted to after every record. On startup the file is loaded and integrity-checked; a corrupted chain is refused. When omitted, memory stays process-local.

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

#### `export()`

Return the full chain as copies, oldest first. Suitable for handing to a persistence adapter or another `Memory`.

#### `FileMemoryStore`

The durable JSON-lines adapter used by `persistPath`. Can also be used standalone:

```typescript
import { FileMemoryStore } from '@omega-v/memory';

const store = new FileMemoryStore('/var/lib/omega-v/memory.jsonl');
store.save(memory.export());
const entries = store.load();
Memory.verifyChain(entries); // true
```

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
**Shipped:** Durable JSON-lines persistence adapter (`persistPath`)
**Next:** Streaming reads for large chains; pluggable storage backends (SQLite, object storage)
**Last Updated:** 2026-08-15
