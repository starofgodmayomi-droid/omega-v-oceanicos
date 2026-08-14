import { createHash } from 'node:crypto';
import {
  Attestation,
  EventLogEntry,
  MemoryRecord,
  Observation,
  VerificationResult,
} from '@omega-v/types';

export type Rememberable =
  | { type: 'OBSERVATION'; data: Observation }
  | { type: 'VERIFICATION'; data: VerificationResult }
  | { type: 'ATTESTATION'; data: Attestation }
  | { type: 'MEMORY'; data: MemoryRecord };

export type MemoryQuery = {
  type?: EventLogEntry['type'];
  observationId?: string;
  verificationId?: string;
  limit?: number;
};

/**
 * Remember: append-only memory for the MINI kernel.
 *
 * Step 3 of MINI: 👁 Observe → ✓ Verify → 🧠 Remember
 *
 * No assumed database. No assumed ecosystem. Just durable, chained memory.
 */
export class Remember {
  private entries: EventLogEntry[] = [];
  private memoryCounter = 0;

  /**
   * Append a record to memory. Entries are never mutated or deleted.
   */
  public append(item: Rememberable): EventLogEntry {
    const previousHash =
      this.entries.length === 0 ? this.genesisHash() : this.entries[this.entries.length - 1].hash;

    const recordedAt = new Date().toISOString();
    const id = this.entries.length + 1;
    const payload = {
      id,
      type: item.type,
      data: item.data,
      recordedAt,
      previousHash,
    };
    const hash = this.hashPayload(payload);

    const entry: EventLogEntry = {
      ...payload,
      hash,
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Form a MemoryRecord from an observation + verification and store it.
   */
  public remember(observation: Observation, verification: VerificationResult): MemoryRecord {
    const memory: MemoryRecord = {
      id: this.generateMemoryId(),
      observationId: observation.id,
      verificationId: verification.id,
      verified: verification.summary.passed,
      confidence: verification.summary.confidence,
      summary: `${observation.claim.statement} → ${
        verification.summary.passed ? 'verified' : 'unverified'
      }`,
      rememberedAt: new Date().toISOString(),
    };

    this.append({ type: 'OBSERVATION', data: observation });
    this.append({ type: 'VERIFICATION', data: verification });
    this.append({ type: 'MEMORY', data: memory });

    return memory;
  }

  /**
   * Recall a single entry by sequential log id.
   */
  public recall(id: number): EventLogEntry | undefined {
    return this.entries.find((entry) => entry.id === id);
  }

  /**
   * Recall a MemoryRecord by memory id.
   */
  public recallMemory(memoryId: string): MemoryRecord | undefined {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      if (entry.type === 'MEMORY') {
        const data = entry.data as MemoryRecord;
        if (data.id === memoryId) {
          return data;
        }
      }
    }
    return undefined;
  }

  /**
   * Query the append-only log. Results are newest-first.
   */
  public query(filter: MemoryQuery = {}): EventLogEntry[] {
    let results = [...this.entries];

    if (filter.type) {
      results = results.filter((entry) => entry.type === filter.type);
    }

    if (filter.observationId) {
      results = results.filter((entry) => {
        const data = entry.data as { observationId?: string; id?: string };
        if (entry.type === 'OBSERVATION') {
          return data.id === filter.observationId;
        }
        return data.observationId === filter.observationId;
      });
    }

    if (filter.verificationId) {
      results = results.filter((entry) => {
        const data = entry.data as { verificationId?: string; id?: string };
        if (entry.type === 'VERIFICATION') {
          return data.id === filter.verificationId;
        }
        return data.verificationId === filter.verificationId;
      });
    }

    results.reverse();

    if (typeof filter.limit === 'number' && filter.limit >= 0) {
      return results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Full ordered log (oldest first).
   */
  public all(): readonly EventLogEntry[] {
    return this.entries;
  }

  /**
   * Number of entries in memory.
   */
  public size(): number {
    return this.entries.length;
  }

  /**
   * Verify the hash chain integrity of all remembered entries.
   */
  public verifyIntegrity(): boolean {
    let previousHash = this.genesisHash();

    for (const entry of this.entries) {
      if (entry.previousHash !== previousHash) {
        return false;
      }

      const expectedHash = this.hashPayload({
        id: entry.id,
        type: entry.type,
        data: entry.data,
        recordedAt: entry.recordedAt,
        previousHash: entry.previousHash,
      });

      if (entry.hash !== expectedHash) {
        return false;
      }

      previousHash = entry.hash;
    }

    return true;
  }

  private genesisHash(): string {
    return createHash('sha256').update('Ω∞v-MINI-GENESIS').digest('hex');
  }

  private hashPayload(payload: {
    id: number;
    type: EventLogEntry['type'];
    data: EventLogEntry['data'];
    recordedAt: string;
    previousHash: string;
  }): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private generateMemoryId(): string {
    this.memoryCounter += 1;
    return `mem-${new Date().toISOString().split('T')[0]}-${this.memoryCounter}`;
  }
}

export default Remember;
