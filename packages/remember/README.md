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

## Status

MINI kernel component. Attestation, APIs, and full-stack layers are earned expansions beyond this package.
