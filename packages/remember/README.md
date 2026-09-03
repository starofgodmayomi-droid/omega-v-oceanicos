# @omega-v/remember

🧠 **Remember** — append-only memory for the Ω∞v MINI kernel.

```text
💧 Ω∞v MINI ::= 👁 Observe → ✓ Verify → 🧠 Remember
```

## Purpose

Remember is the third leg of the smallest useful kernel. It stores verified experience without assuming a database, ecosystem, or capital stack.

- Append-only event log
- Hash-chained integrity
- Memory records linking observation ↔ verification

## Usage

```typescript
import { Remember } from '@omega-v/remember';

const memory = new Remember();
const record = memory.remember(observation, verification);

memory.verifyIntegrity(); // true
memory.query({ type: 'MEMORY' });
```

## Public API

```typescript
class Remember {
  append(item: Rememberable): EventLogEntry;
  remember(observation, verification): MemoryRecord;
  recall(id: number): EventLogEntry | undefined;
  recallMemory(memoryId: string): MemoryRecord | undefined;
  query(filter?: MemoryQuery): EventLogEntry[];
  all(): readonly EventLogEntry[];
  size(): number;
  verifyIntegrity(): boolean;
}
```

## Durable file store

`FileMemoryStore(path, secret?)` persists the hash chain as append-only JSONL. When a secret is supplied, or when `OMEGA_MEMORY_KEY` is configured, each new line is authenticated with AES-256-GCM using the `omega-memory-v1` envelope. During controlled rotation, `OMEGA_MEMORY_KEY_PREVIOUS` permits reads of the prior key while new writes use `OMEGA_MEMORY_KEY`; mixed-key files remain append-only until migration is complete. `encryptionKeySource()` reports `current`, `previous`, or `mixed` according to the authenticated encrypted lines actually restored, without exposing key material. Legacy plaintext lines remain readable during controlled migration; encrypted lines that cannot authenticate are counted as skipped and reported as a `partial` load rather than silently treated as an empty chain.

The package does not expose the secret or claim key custody. Operators remain responsible for secret provisioning, rotation, recovery, and protection of the memory path.

## Status

MINI kernel component. Attestation, APIs, and full-stack layers are earned expansions beyond this package.
