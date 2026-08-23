import {
  EventLogEntry,
  Observation,
  VerificationResult,
  Attestation,
  QueryResult,
  SystemMetrics,
} from '@omega-v/types';

/**
 * ProvenanceStore: Append-only event log with hash-chained integrity
 *
 * Step 4 of the verification loop — Record
 * Maintains an immutable, auditable history of all observations,
 * verifications, and attestations.
 */
export class ProvenanceStore {
  private log: EventLogEntry[] = [];
  private sequenceCounter = 0;

  /** Genesis hash — the anchor of the chain */
  static readonly GENESIS_HASH = '0x' + '0'.repeat(64);

  /**
   * Record an observation into the event log
   */
  public recordObservation(observation: Observation): EventLogEntry {
    return this.append('OBSERVATION', observation);
  }

  /**
   * Record a verification result into the event log
   */
  public recordVerification(verification: VerificationResult): EventLogEntry {
    return this.append('VERIFICATION', verification);
  }

  /**
   * Record an attestation into the event log
   */
  public recordAttestation(attestation: Attestation): EventLogEntry {
    return this.append('ATTESTATION', attestation);
  }

  /**
   * Query the log with optional filters
   */
  public query(options?: {
    type?: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION';
    since?: string;
    limit?: number;
    offset?: number;
  }): QueryResult {
    let filtered = [...this.log];

    if (options?.type) {
      filtered = filtered.filter((e) => e.type === options.type);
    }

    if (options?.since) {
      const since = new Date(options.since).getTime();
      filtered = filtered.filter((e) => new Date(e.recordedAt).getTime() >= since);
    }

    const total = filtered.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return {
      events: filtered.slice(offset, offset + limit),
      totalCount: total,
      pagination: {
        offset,
        limit,
        hasMore: offset + limit < total,
      },
      queriedAt: new Date().toISOString(),
    };
  }

  /**
   * Get all entries in the log
   */
  public getEntries(): EventLogEntry[] {
    return [...this.log];
  }

  /**
   * Get a specific entry by sequential ID
   */
  public getEntry(id: number): EventLogEntry | undefined {
    return this.log.find((e) => e.id === id);
  }

  /**
   * Get the latest entry
   */
  public getLatest(): EventLogEntry | undefined {
    return this.log[this.log.length - 1];
  }

  /**
   * Get total number of entries
   */
  public size(): number {
    return this.log.length;
  }

  /**
   * Verify the integrity of the entire chain
   * Returns true if all hashes are valid and the chain is unbroken
   */
  public verifyChainIntegrity(): { valid: boolean; brokenAt?: number } {
    for (let i = 0; i < this.log.length; i++) {
      const entry = this.log[i];
      const expectedPrev = i === 0 ? ProvenanceStore.GENESIS_HASH : this.log[i - 1].hash;

      if (entry.previousHash !== expectedPrev) {
        return { valid: false, brokenAt: entry.id };
      }

      const recomputed = this.computeHash(
        entry.type,
        entry.data,
        entry.recordedAt,
        entry.previousHash
      );
      if (entry.hash !== recomputed) {
        return { valid: false, brokenAt: entry.id };
      }
    }
    return { valid: true };
  }

  /**
   * Compute system metrics from the log
   */
  public getMetrics(): SystemMetrics {
    const observations = this.log.filter((e) => e.type === 'OBSERVATION');
    const verifications = this.log.filter((e) => e.type === 'VERIFICATION');
    const attestations = this.log.filter((e) => e.type === 'ATTESTATION');

    const passedVerifications = verifications.filter(
      (e) => (e.data as VerificationResult).summary.passed
    );

    const successRate =
      verifications.length > 0 ? passedVerifications.length / verifications.length : 0;

    const confidences = attestations.map((e) => (e.data as Attestation).confidence);
    const systemConfidence =
      confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

    return {
      totalObservations: observations.length,
      totalVerifications: verifications.length,
      avgVerificationTime: 0, // Would require timing instrumentation
      successRate,
      totalAttestations: attestations.length,
      systemConfidence,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Append a new entry to the immutable log
   */
  private append(
    type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION',
    data: Observation | VerificationResult | Attestation
  ): EventLogEntry {
    this.sequenceCounter++;
    const recordedAt = new Date().toISOString();
    const previousHash =
      this.log.length === 0 ? ProvenanceStore.GENESIS_HASH : this.log[this.log.length - 1].hash;

    const hash = this.computeHash(type, data, recordedAt, previousHash);

    const entry: EventLogEntry = {
      id: this.sequenceCounter,
      type,
      data,
      recordedAt,
      hash,
      previousHash,
    };

    // Immutable append — no modification, no deletion
    this.log.push(Object.freeze(entry) as EventLogEntry);
    return entry;
  }

  /**
   * Compute a deterministic hash for an entry
   * In production this would use SHA-256
   */
  private computeHash(
    type: string,
    data: unknown,
    recordedAt: string,
    previousHash: string
  ): string {
    const payload = JSON.stringify({ type, data, recordedAt, previousHash });
    let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
    for (let i = 0; i < payload.length; i++) {
      hash ^= payload.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193); // FNV prime
      hash = hash >>> 0; // keep unsigned 32-bit
    }
    return '0x' + hash.toString(16).padStart(64, '0');
  }
}

export default ProvenanceStore;
