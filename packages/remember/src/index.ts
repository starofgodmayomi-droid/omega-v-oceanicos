import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  IMiniBlock,
  IObservation,
  IEvidence,
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
interface ISqliteDatabase {
  exec(sql: string): void;
  close?(): void;
  prepare(sql: string): {
    get(...params: any[]): any;
    all(...params: any[]): any[];
    run(...params: any[]): any;
  };
}

/**
 * High-throughput block persistence engine.
 *
 * Merged contract: the durable block ledger consumed by MINI and the API
 * (`append(observation, evidence)`, `getTip`) plus the block-oriented surface
 * used by the package tests (`append(block)`, `getHistory`, `height`).
 */
export class RememberEngine {
  private db: ISqliteDatabase;
  private readonly rootHash = '8a3f91c2e4f9011b989210ffffffffff';

  constructor(dbPath: string = ':memory:') {
    try {
      const BetterSqlite = require('better-sqlite3');
      this.db = new BetterSqlite(dbPath);
    } catch {
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(dbPath);
    }
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS ledger (id_index INTEGER PRIMARY KEY, timestamp TEXT NOT NULL, observation_json TEXT NOT NULL, evidence_json TEXT NOT NULL, previous_hash TEXT NOT NULL, hash TEXT NOT NULL, nonce INTEGER NOT NULL);`
    );
  }

  public getTip(): IMiniBlock | null {
    const row: any = this.db.prepare('SELECT * FROM ledger ORDER BY id_index DESC LIMIT 1').get();
    if (!row) return null;
    return {
      index: row.id_index,
      timestamp: row.timestamp,
      observation: JSON.parse(row.observation_json),
      evidence: JSON.parse(row.evidence_json),
      previousHash: row.previous_hash,
      hash: row.hash,
      nonce: row.nonce,
    };
  }

  public getHistory(): IMiniBlock[] {
    const rows: any[] = this.db.prepare('SELECT * FROM ledger ORDER BY id_index ASC').all();
    return rows.map((row) => ({
      index: row.id_index,
      timestamp: row.timestamp,
      observation: JSON.parse(row.observation_json),
      evidence: JSON.parse(row.evidence_json),
      previousHash: row.previous_hash,
      hash: row.hash,
      nonce: row.nonce,
    }));
  }

  public get height(): number {
    const row: any = this.db.prepare('SELECT COUNT(*) AS count FROM ledger').get();
    return Number(row?.count ?? 0);
  }

  /** Block form: persist an already-built block (legacy contract). */
  public append(block: IMiniBlock): IMiniBlock;
  /** Observation form: hash and persist a new block (kernel/API contract). */
  public append(observation: IObservation, evidence: IEvidence): IMiniBlock;
  public append(observationOrBlock: IObservation | IMiniBlock, evidence?: IEvidence): IMiniBlock {
    if (!evidence) {
      const block = observationOrBlock as IMiniBlock;
      this.db
        .prepare(
          `INSERT OR REPLACE INTO ledger (id_index, timestamp, observation_json, evidence_json, previous_hash, hash, nonce) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          block.index,
          block.timestamp,
          JSON.stringify(block.observation),
          JSON.stringify(block.evidence),
          block.previousHash,
          block.hash,
          block.nonce
        );
      return block;
    }

    const observation = observationOrBlock as IObservation;
    const tip = this.getTip();
    const nextIndex = tip ? tip.index + 1 : 4101;
    const previousHash = tip ? tip.hash : this.rootHash;
    const timestamp = new Date().toISOString();
    let nonce = 0;
    let blockHash = '';
    const obsStr = JSON.stringify(observation);
    const evStr = JSON.stringify(evidence);
    while (true) {
      blockHash = createHash('sha256')
        .update(`${nextIndex}-${timestamp}-${obsStr}-${evStr}-${previousHash}-${nonce}`)
        .digest('hex');
      if (blockHash.substring(0, 2) === '00') break;
      nonce++;
    }
    this.db
      .prepare(
        `INSERT INTO ledger (id_index, timestamp, observation_json, evidence_json, previous_hash, hash, nonce) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(nextIndex, timestamp, obsStr, evStr, previousHash, blockHash, nonce);
    return { index: nextIndex, timestamp, observation, evidence, previousHash, hash: blockHash, nonce };
  }

  public close(): void {
    this.db.close?.();
  }
}

export * from './ledger.js';
export * from './store.js';
export { Remember as default };
