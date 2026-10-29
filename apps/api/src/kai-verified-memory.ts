/**
 * Ω∞v Σ — verified-only memory.
 *
 *   M(t+1) = M(t) ∪ Δ  only when V(Δ) = ⊤,  V ≡ (Expected ≡ Observed)
 *
 * This store is the durable form of that rule. Only a drop OMEGA already judged
 * VERIFIED is ever appended; a DIVERGENT, UNKNOWN or NOT_EXECUTED drop leaves
 * this file byte-identical. That is the difference from the KAI journal, which
 * deliberately keeps every verdict because an audit trail that deletes its own
 * failures is not an audit trail.
 *
 * Like the journal it is append-only and hash-chained, and it degrades closed:
 * a tampered or unreadable line marks the store degraded and returns no entries,
 * rather than silently reloading a shorter history.
 */
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const KAI_VERIFIED_KIND = 'OMEGA_KAI_VERIFIED_MEMORY' as const;
const GENESIS = 'omega-kai-verified-memory-genesis-v1';
const MAX_VERIFIED_ENTRIES = 5000;

export interface KaiVerifiedDraft {
  readonly intent: string;
  readonly evidenceHash: string;
  /** Hash(x) of the verified drop — its identity in Σ. */
  readonly dropHash: string;
}

export interface KaiVerifiedEntry extends KaiVerifiedDraft {
  readonly kind: typeof KAI_VERIFIED_KIND;
  readonly id: string;
  readonly timestamp: string;
  readonly sequence: number;
  readonly previousHash: string;
  readonly hash: string;
}

const hashEntry = (entry: Omit<KaiVerifiedEntry, 'hash'>): string =>
  createHash('sha256').update(JSON.stringify(entry)).digest('hex');

export class FileKaiVerifiedStore {
  private entries: KaiVerifiedEntry[];
  private integrity = true;

  constructor(private readonly path: string) {
    this.entries = this.load();
  }

  append(draft: KaiVerifiedDraft): KaiVerifiedEntry {
    if (!this.integrity) throw new Error('verified memory integrity is degraded');
    if (this.entries.length >= MAX_VERIFIED_ENTRIES) throw new Error('verified memory capacity exhausted');
    const previousHash = this.entries.at(-1)?.hash ?? GENESIS;
    const unsigned: Omit<KaiVerifiedEntry, 'hash'> = {
      ...draft,
      kind: KAI_VERIFIED_KIND,
      id: `kai-verified-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      sequence: this.entries.length + 1,
      previousHash,
    };
    const entry: KaiVerifiedEntry = { ...unsigned, hash: hashEntry(unsigned) };
    if (this.path !== ':memory:') {
      mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
      appendFileSync(this.path, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', flag: 'a', mode: 0o600 });
    }
    this.entries.push(entry);
    return entry;
  }

  all(): readonly KaiVerifiedEntry[] {
    return [...this.entries];
  }

  /** Newest first, bounded so a list surface stays finite. */
  recent(limit: number): readonly KaiVerifiedEntry[] {
    const bounded = Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_VERIFIED_ENTRIES) : 20;
    return this.entries.slice(-bounded).reverse();
  }

  height(): number {
    return this.entries.length;
  }

  verifyIntegrity(): boolean {
    return this.integrity;
  }

  private load(): KaiVerifiedEntry[] {
    if (this.path === ':memory:') return [];
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      this.integrity = false;
      return [];
    }
    const loaded: KaiVerifiedEntry[] = [];
    let previousHash = GENESIS;
    try {
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line) as KaiVerifiedEntry;
        const { hash, ...unsigned } = parsed;
        if (
          parsed.kind !== KAI_VERIFIED_KIND ||
          parsed.sequence !== loaded.length + 1 ||
          parsed.previousHash !== previousHash ||
          typeof parsed.intent !== 'string' ||
          typeof parsed.evidenceHash !== 'string' ||
          typeof parsed.dropHash !== 'string' ||
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
