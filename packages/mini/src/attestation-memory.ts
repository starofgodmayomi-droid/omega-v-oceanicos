import { createHash } from 'node:crypto';
import type { OmegaChangeRecord } from '@oceanicos/types';
import type { TransitionExecution } from './transition.js';
import type { RealityReconciliation } from './reality.js';

export interface AttestationEntry {
  readonly index: number;
  readonly changeId: string;
  readonly transitionStatus: string;
  readonly attestationId: string | undefined;
  readonly realityVerdict: string | undefined;
  readonly claimedStateHash: string;
  readonly observedStateHash: string;
  readonly discrepancies: readonly string[];
  readonly previousHash: string;
  readonly hash: string;
  readonly timestamp: string;
}

export interface AttestationMemory {
  readonly entries: readonly AttestationEntry[];
  readonly height: number;
  readonly tipHash: string;
  readonly integrityValid: boolean;
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function computeEntryHash(entry: Omit<AttestationEntry, 'hash'>): string {
  const payload = JSON.stringify({
    index: entry.index,
    changeId: entry.changeId,
    transitionStatus: entry.transitionStatus,
    attestationId: entry.attestationId,
    realityVerdict: entry.realityVerdict,
    claimedStateHash: entry.claimedStateHash,
    observedStateHash: entry.observedStateHash,
    previousHash: entry.previousHash,
    timestamp: entry.timestamp,
  });
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Append-only attestation memory.
 *
 * Each entry records:
 * - The change identifier and transition execution status
 * - The attestation digest from the transition executor
 * - The reality reconciliation verdict and discrepancy evidence
 * - A chain hash linking to the previous entry (tamper detection)
 *
 * This memory does NOT grant authority, retry execution, or modify change
 * records. It is an immutable evidence log.
 */
export class OmegaAttestationMemory {
  private readonly chain: AttestationEntry[] = [];

  /**
   * Record a transition execution and its optional reality reconciliation.
   */
  append(
    change: OmegaChangeRecord,
    execution: TransitionExecution,
    reconciliation?: RealityReconciliation,
  ): AttestationEntry {
    const previousHash = this.chain.length > 0
      ? this.chain[this.chain.length - 1].hash
      : GENESIS_HASH;

    const partial = {
      index: this.chain.length,
      changeId: change.id,
      transitionStatus: execution.status,
      attestationId: execution.attestationId,
      realityVerdict: reconciliation?.verdict,
      claimedStateHash: reconciliation?.claimedStateHash ?? '',
      observedStateHash: reconciliation?.observedStateHash ?? '',
      discrepancies: reconciliation?.discrepancies ?? [],
      previousHash,
      timestamp: new Date().toISOString(),
    };

    const hash = computeEntryHash(partial);
    const entry: AttestationEntry = { ...partial, hash };
    this.chain.push(entry);
    return entry;
  }

  /**
   * Retrieve a specific entry by index.
   */
  get(index: number): AttestationEntry | undefined {
    return this.chain[index];
  }

  /**
   * Get the current tip (latest entry).
   */
  tip(): AttestationEntry | undefined {
    return this.chain.length > 0 ? this.chain[this.chain.length - 1] : undefined;
  }

  /**
   * Get the full memory snapshot (immutable copy).
   */
  snapshot(): AttestationMemory {
    return {
      entries: [...this.chain],
      height: this.chain.length,
      tipHash: this.chain.length > 0 ? this.chain[this.chain.length - 1].hash : GENESIS_HASH,
      integrityValid: this.verifyIntegrity(),
    };
  }

  /**
   * Verify chain integrity: each entry's previousHash must match the
   * preceding entry's hash, and recomputed hashes must match stored hashes.
   */
  verifyIntegrity(): boolean {
    for (let i = 0; i < this.chain.length; i++) {
      const entry = this.chain[i];
      const expectedPrev = i === 0 ? GENESIS_HASH : this.chain[i - 1].hash;
      if (entry.previousHash !== expectedPrev) return false;

      const { hash: _stored, ...rest } = entry;
      const recomputed = computeEntryHash(rest);
      if (recomputed !== entry.hash) return false;
    }
    return true;
  }

  /**
   * Search the chain for entries related to a specific change.
   */
  findByChangeId(changeId: string): readonly AttestationEntry[] {
    return this.chain.filter((e) => e.changeId === changeId);
  }

  get height(): number {
    return this.chain.length;
  }
}
