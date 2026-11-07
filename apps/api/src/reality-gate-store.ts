/**
 * Durable reality memory — the gate's chain as an append-only journal.
 *
 * The gate itself (`@oceanicos/omega`) owns the hashing and the branch order;
 * this module only decides where the chain lives. Every committed link is
 * appended as one JSON line to `<dbPath>.reality-memory.jsonl`, and on boot the
 * journal is re-read and re-proved: each link must carry the hash of the link
 * before it, from `omega-reality-memory-genesis-v1` forward.
 *
 * A journal that cannot be re-proved is a degraded chain, not an empty one: the
 * store reports `integrity: false`, keeps nothing in memory, and every read or
 * step answers `503 REALITY_MEMORY_INTEGRITY_DEGRADED`. Durable memory is still
 * not proof — it is only a record that survives a restart.
 */
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  REALITY_MEMORY_GENESIS,
  createRealityMemory,
  realityEntryHash,
  type RealityMemory,
  type RealityMemoryEntry,
} from '@oceanicos/omega';

const HASH_PATTERN = /^[0-9a-f]{64}$/;

export interface RealityMemoryStore {
  readonly memory: RealityMemory;
  readonly path: string;
  readonly memoryScope: 'process' | 'append-only-journal';
  readonly restoredEntries: number;
  verifyIntegrity(): boolean;
}

interface LoadedJournal {
  entries: RealityMemoryEntry[];
  integrity: boolean;
}

const isEntry = (value: any, index: number, previousHash: string): value is RealityMemoryEntry =>
  value !== null &&
  typeof value === 'object' &&
  value.index === index &&
  typeof value.recordedAt === 'string' &&
  HASH_PATTERN.test(value.deltaHash) &&
  HASH_PATTERN.test(value.evidenceHash) &&
  HASH_PATTERN.test(value.entryHash) &&
  value.previousHash === previousHash &&
  value.entryHash === realityEntryHash(previousHash, value.deltaHash, value.evidenceHash);

const loadJournal = (path: string): LoadedJournal => {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (error) {
    // A journal that does not exist yet is an empty chain, not a failure.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { entries: [], integrity: true };
    return { entries: [], integrity: false };
  }

  const entries: RealityMemoryEntry[] = [];
  let previousHash = REALITY_MEMORY_GENESIS;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (!isEntry(parsed, entries.length, previousHash)) throw new Error('reality memory journal integrity check failed');
      entries.push(parsed);
      previousHash = parsed.entryHash;
    } catch {
      // Fail closed: a corrupt or reordered line invalidates the whole chain,
      // so nothing is restored and no step may append on top of it.
      return { entries: [], integrity: false };
    }
  }
  return { entries, integrity: true };
};

/**
 * Open the reality memory backed by `path`. `:memory:` keeps the process-scoped
 * behaviour (no journal, chain returns to genesis on restart).
 */
export function openRealityMemory(path: string): RealityMemoryStore {
  const durable = path !== ':memory:';
  const journal = durable ? loadJournal(path) : { entries: [], integrity: true };
  const inner = createRealityMemory({ entries: journal.entries });

  const memory: RealityMemory = {
    ...inner,
    step: (delta) => {
      const step = inner.step(delta);
      if (!step.entry || !durable) return step;
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      appendFileSync(path, `${JSON.stringify(step.entry)}\n`, { encoding: 'utf8', flag: 'a', mode: 0o600 });
      return step;
    },
  };

  return {
    memory,
    path,
    memoryScope: durable ? 'append-only-journal' : 'process',
    restoredEntries: journal.entries.length,
    verifyIntegrity: () => journal.integrity && memory.verifyChain(),
  };
}
