import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  IMiniBlock,
  Attestation,
  EventLogEntry,
  MemoryRecord,
  Observation,
  VerificationResult,
} from '@oceanicos/types';
import { MemoryStore, FileMemoryStore, StoreSource, EncryptionKeySource } from './store.js';

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
 * Remember: append-only cognitive memory for the MINI kernel.
 * Step 3 of MINI: Observe -> Verify -> Remember
 */
export class Remember {
  private entries: EventLogEntry[] = [];
  private memoryCounter = 0;

  constructor(private readonly store?: MemoryStore) {
    if (!store) return;
    this.entries = store.load();
    this.memoryCounter = this.entries.filter((entry) => entry.type === 'MEMORY').length;
  }

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
    this.store?.append(entry);
    return entry;
  }

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
      recordedAt: new Date().toISOString(),
      rememberedAt: new Date().toISOString(),
    };

    this.append({ type: 'OBSERVATION', data: observation });
    this.append({ type: 'VERIFICATION', data: verification });
    this.append({ type: 'MEMORY', data: memory });

    return memory;
  }

  public rememberWithEntries(
    observation: Observation,
    verification: VerificationResult
  ): { memory: MemoryRecord; entries: EventLogEntry[] } {
    const e1 = this.append({ type: 'OBSERVATION', data: observation });
    const e2 = this.append({ type: 'VERIFICATION', data: verification });
    const memory: MemoryRecord = {
      id: this.generateMemoryId(),
      observationId: observation.id,
      verificationId: verification.id,
      verified: verification.summary.passed,
      confidence: verification.summary.confidence,
      summary: `${observation.claim.statement} → ${
        verification.summary.passed ? 'verified' : 'unverified'
      }`,
      recordedAt: new Date().toISOString(),
      rememberedAt: new Date().toISOString(),
    };
    const e3 = this.append({ type: 'MEMORY', data: memory });
    return { memory, entries: [e1, e2, e3] };
  }

  public recall(id: number): EventLogEntry | undefined {
    if (!Number.isInteger(id) || id < 1 || id > this.entries.length) {
      return undefined;
    }
    return this.entries[id - 1];
  }

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

    if (typeof filter.limit === 'number' && filter.limit > 0) {
      return results.slice(0, filter.limit);
    }

    return results;
  }

  public all(): readonly EventLogEntry[] {
    return this.entries;
  }

  public size(): number {
    return this.entries.length;
  }

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

/**
 * High-throughput block persistence engine.
 */
export class RememberEngine {
  private file: string;
  private blocks: IMiniBlock[] = [];

  constructor(file = './data/oceanicos.jsonl') {
    this.file = file;
    if (file !== ':memory:') {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (fs.existsSync(file)) {
        this.blocks = fs
          .readFileSync(file, 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line));
      }
    }
  }

  public getTip(): IMiniBlock | null {
    return this.blocks.at(-1) ?? null;
  }

  public getHistory(): IMiniBlock[] {
    return this.blocks;
  }

  public get height(): number {
    return this.blocks.length;
  }

  public append(block: IMiniBlock): void {
    this.blocks.push(block);
    if (this.file !== ':memory:') {
      fs.appendFileSync(this.file, `${JSON.stringify(block)}\n`);
    }
  }
}

export * from './ledger.js';
export * from './store.js';
export { Remember as default };
