/**
 * Ω∞v KAI memory — the append-only, hash-chained record of what the body observed.
 *
 * A KAI entry is evidence that a bounded loop ran and what it concluded. It is
 * not proof of external reality, not authority to act, and not durable across a
 * destroyed volume. `status` is the OMEGA verdict for that loop, preserved
 * exactly — a DIVERGENT or UNKNOWN drop is remembered as such, never upgraded.
 */
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const KAI_MEMORY_KIND = 'OMEGA_KAI_MEMORY' as const;
export const KAI_MEMORY_STATUSES = ['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED'] as const;
export type KaiMemoryStatus = (typeof KAI_MEMORY_STATUSES)[number];
export const KAI_AUTHORITY_LEVELS = ['READ_ONLY', 'BOUNDED', 'AUTONOMOUS'] as const;
export type KaiAuthorityLevel = (typeof KAI_AUTHORITY_LEVELS)[number];

export interface KaiMemoryDraft {
  readonly intent: string;
  readonly evidenceHash: string;
  readonly status: KaiMemoryStatus;
  readonly authorityLevel: KaiAuthorityLevel;
  readonly expectedOutcome?: string;
  readonly reason?: string;
}

export interface KaiMemoryEntry extends KaiMemoryDraft {
  readonly kind: typeof KAI_MEMORY_KIND;
  readonly id: string;
  readonly timestamp: string;
  readonly sequence: number;
  readonly previousHash: string;
  readonly hash: string;
}

const GENESIS = 'omega-kai-memory-genesis-v1';
const MAX_JOURNAL_ENTRIES = 5000;

const hashEntry = (entry: Omit<KaiMemoryEntry, 'hash'>): string =>
  createHash('sha256').update(JSON.stringify(entry)).digest('hex');

export class FileKaiMemoryStore {
  private entries: KaiMemoryEntry[];
  private integrity = true;

  constructor(private readonly path: string) {
    this.entries = this.load();
  }

  append(draft: KaiMemoryDraft): KaiMemoryEntry {
    if (!this.integrity) throw new Error('kai memory journal integrity is degraded');
    if (this.entries.length >= MAX_JOURNAL_ENTRIES) throw new Error('kai memory journal capacity exhausted');
    const previousHash = this.entries.at(-1)?.hash ?? GENESIS;
    const unsigned: Omit<KaiMemoryEntry, 'hash'> = {
      ...draft,
      kind: KAI_MEMORY_KIND,
      id: `kai-memory-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      sequence: this.entries.length + 1,
      previousHash,
    };
    const entry: KaiMemoryEntry = { ...unsigned, hash: hashEntry(unsigned) };
    if (this.path !== ':memory:') {
      mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
      appendFileSync(this.path, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', flag: 'a', mode: 0o600 });
    }
    this.entries.push(entry);
    return entry;
  }

  all(): readonly KaiMemoryEntry[] {
    return [...this.entries];
  }

  /** Most recent entries first, bounded so a list surface stays finite. */
  recent(limit: number): readonly KaiMemoryEntry[] {
    const bounded = Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_JOURNAL_ENTRIES) : 20;
    return this.entries.slice(-bounded).reverse();
  }

  height(): number {
    return this.entries.length;
  }

  verifyIntegrity(): boolean {
    return this.integrity;
  }

  private load(): KaiMemoryEntry[] {
    if (this.path === ':memory:') return [];
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      this.integrity = false;
      return [];
    }
    const loaded: KaiMemoryEntry[] = [];
    let previousHash = GENESIS;
    try {
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line) as KaiMemoryEntry;
        const { hash, ...unsigned } = parsed;
        if (
          parsed.kind !== KAI_MEMORY_KIND ||
          parsed.sequence !== loaded.length + 1 ||
          parsed.previousHash !== previousHash ||
          !KAI_MEMORY_STATUSES.includes(parsed.status) ||
          !KAI_AUTHORITY_LEVELS.includes(parsed.authorityLevel) ||
          typeof parsed.intent !== 'string' ||
          typeof parsed.evidenceHash !== 'string' ||
          hashEntry(unsigned) !== hash
        ) {
          this.integrity = false;
          return [];
        }
        previousHash = hash;
        loaded.push(parsed);
      }
    } catch {
      this.integrity = false;
      return [];
    }
    return loaded;
  }
}
