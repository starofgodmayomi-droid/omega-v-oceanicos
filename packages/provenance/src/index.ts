import { createHash } from 'node:crypto';

/**
 * Ω∞v Provenance Chain Engine (C7)
 *
 * Append-only, hash-chained provenance ledger. Each entry records the source,
 * attribution, and lineage of a change, cryptographically linked to the
 * previous entry. The chain is tamper-evident: any modification breaks the
 * hash linkage and `verifyIntegrity()` returns false.
 *
 * Constitutional invariants:
 *   - History is immutable; entries are never edited or deleted.
 *   - State is recomputable; provenance is the evidence trail.
 *   - Corrections create new entries rather than rewriting old ones.
 *   - Provenance is evidence of lineage, not proof of correctness.
 */

export interface ProvenanceEntry {
  readonly id: string;
  readonly changeId: string;
  readonly source: string;
  readonly attributedTo: string | null;
  readonly lineage: readonly string[];
  readonly sequence: number;
  readonly previousHash: string;
  readonly hash: string;
  readonly createdAt: string;
}

const GENESIS_HASH = 'omega-provenance-genesis-v1';

const sha256 = (payload: string): string => createHash('sha256').update(payload).digest('hex');

const computeHash = (entry: Omit<ProvenanceEntry, 'hash'>): string =>
  sha256(JSON.stringify(entry));

/**
 * Append-only provenance chain.
 *
 * Entries are linked: each entry's `previousHash` is the hash of the prior
 * entry (or the genesis constant for the first entry). The `hash` field is
 * computed over all other fields, making the chain tamper-evident.
 */
export class ProvenanceChain {
  private readonly entries: ProvenanceEntry[] = [];

  /**
   * Append a new provenance entry.
   *
   * @param changeId     The id of the change this entry records.
   * @param source       Where the change originated (e.g. 'mini-pipeline').
   * @param attributedTo Who is responsible (authority), or null.
   * @param lineage      Additional lineage tokens to include.
   * @returns The created, hash-linked entry.
   */
  append(
    changeId: string,
    source: string,
    attributedTo: string | null,
    lineage: readonly string[] = [],
    now: () => string = () => new Date().toISOString(),
  ): ProvenanceEntry {
    const sequence = this.entries.length + 1;
    const previousHash = this.entries.at(-1)?.hash ?? GENESIS_HASH;
    const createdAt = now();

    const unsigned: Omit<ProvenanceEntry, 'hash'> = {
      id: `provenance-${sha256(`${changeId}:${sequence}:${createdAt}`).slice(0, 24)}`,
      changeId,
      source,
      attributedTo,
      lineage: [...lineage],
      sequence,
      previousHash,
      createdAt,
    };

    const entry: ProvenanceEntry = { ...unsigned, hash: computeHash(unsigned) };
    this.entries.push(entry);
    return entry;
  }

  /**
   * Verify the integrity of the entire chain.
   *
   * Checks that every entry's hash matches a recomputation, and that each
   * entry's `previousHash` matches the prior entry's `hash`. Returns false
   * on any tampering, gap, or reordering.
   */
  verifyIntegrity(): boolean {
    let previousHash = GENESIS_HASH;
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (entry.sequence !== i + 1) return false;
      if (entry.previousHash !== previousHash) return false;
      const { hash, ...unsigned } = entry;
      if (computeHash(unsigned) !== hash) return false;
      previousHash = hash;
    }
    return true;
  }

  /**
   * Retrieve the full lineage trace for a change, walking the chain from
   * genesis to the entry for that change.
   */
  getLineage(changeId: string): readonly string[] {
    const entry = this.entries.find((e) => e.changeId === changeId);
    if (!entry) return [];
    const trace: string[] = [];
    let current: ProvenanceEntry | undefined = entry;
    while (current) {
      trace.unshift(...current.lineage, current.id);
      current = this.entries.find((e) => e.hash === current!.previousHash && e.hash !== GENESIS_HASH);
    }
    return trace;
  }

  getEntry(changeId: string): ProvenanceEntry | undefined {
    return this.entries.find((e) => e.changeId === changeId);
  }

  getAll(): readonly ProvenanceEntry[] {
    return [...this.entries];
  }

  get length(): number {
    return this.entries.length;
  }

  get tip(): ProvenanceEntry | undefined {
    return this.entries.at(-1);
  }
}

/**
 * Create a detached provenance digest for a change record, suitable for
 * embedding in an attestation without a full chain.
 */
export function provenanceDigest(input: {
  readonly changeId: string;
  readonly source: string;
  readonly attributedTo: string | null;
  readonly lineage: readonly string[];
  readonly createdAt: string;
}): string {
  return `sha256:${sha256(JSON.stringify(input))}`;
}
