import crypto from 'crypto';
import { IMiniBlock, IObservation, IEvidence, LedgerIntegrity } from '@oceanicos/types';
import { MAX_PROOF_OF_WORK_ATTEMPTS } from './ledger.js';

export const REMEMBER_GENESIS_INDEX = 4101;
export const REMEMBER_POW_PREFIX = '00';

interface ISqliteDatabase {
  exec(sql: string): void;
  close?(): void;
  prepare(sql: string): {
    get(...params: any[]): any;
    run(...params: any[]): any;
    all?(...params: any[]): any[];
  };
}

const hashRememberPayload = (
  index: number,
  timestamp: string,
  observationJson: string,
  evidenceJson: string,
  previousHash: string,
  nonce: number,
): string =>
  crypto
    .createHash('sha256')
    .update(`${index}-${timestamp}-${observationJson}-${evidenceJson}-${previousHash}-${nonce}`)
    .digest('hex');

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

  private loadAllRows(): any[] {
    const stmt = this.db.prepare('SELECT * FROM ledger ORDER BY id_index ASC');
    if (typeof stmt.all === 'function') {
      return stmt.all() ?? [];
    }
    const rows: any[] = [];
    let index = REMEMBER_GENESIS_INDEX;
    for (;;) {
      const row = this.db.prepare('SELECT * FROM ledger WHERE id_index = ?').get(index);
      if (!row) break;
      rows.push(row);
      index += 1;
    }
    return rows;
  }

  private toBlock(row: any): IMiniBlock {
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

  /**
   * Observation of the last stored row. Does not verify the chain.
   * Use `verifyChain()` / `getVerifiedTip()` to lock the tip.
   */
  public getTip(): IMiniBlock | null {
    const row: any = this.db.prepare('SELECT * FROM ledger ORDER BY id_index DESC LIMIT 1').get();
    if (!row) return null;
    return this.toBlock(row);
  }

  public all(): IMiniBlock[] {
    return this.loadAllRows().map((row) => this.toBlock(row));
  }

  /**
   * Walk every stored row and recompute SHA-256 from the canonical committed
   * payload. Empty is valid (nothing to forge). Tamper fails closed.
   */
  public verifyChain(): LedgerIntegrity {
    try {
      const rows = this.loadAllRows();
      if (rows.length === 0) {
        return { valid: true, height: 0, genesisHash: null, tipHash: null };
      }

      let previousHash = this.rootHash;
      let expectedIndex = REMEMBER_GENESIS_INDEX;
      let genesisHash: string | null = null;

      for (const row of rows) {
        if (
          row == null ||
          typeof row.id_index !== 'number' ||
          typeof row.timestamp !== 'string' ||
          typeof row.observation_json !== 'string' ||
          typeof row.evidence_json !== 'string' ||
          typeof row.previous_hash !== 'string' ||
          typeof row.hash !== 'string' ||
          typeof row.nonce !== 'number'
        ) {
          return {
            valid: false,
            height: rows.length,
            genesisHash,
            tipHash: null,
            brokenAt: typeof row?.id_index === 'number' ? row.id_index : expectedIndex,
            reason: 'PARSE_FAILURE',
          };
        }

        if (row.id_index !== expectedIndex) {
          return {
            valid: false,
            height: rows.length,
            genesisHash,
            tipHash: null,
            brokenAt: row.id_index,
            reason: 'INDEX_GAP',
          };
        }

        if (expectedIndex === REMEMBER_GENESIS_INDEX && row.previous_hash !== this.rootHash) {
          return {
            valid: false,
            height: rows.length,
            genesisHash,
            tipHash: null,
            brokenAt: row.id_index,
            reason: 'GENESIS_MISMATCH',
          };
        }

        if (row.previous_hash !== previousHash) {
          return {
            valid: false,
            height: rows.length,
            genesisHash,
            tipHash: null,
            brokenAt: row.id_index,
            reason: 'PREVIOUS_HASH_MISMATCH',
          };
        }

        const expectedHash = hashRememberPayload(
          row.id_index,
          row.timestamp,
          row.observation_json,
          row.evidence_json,
          row.previous_hash,
          row.nonce,
        );
        if (expectedHash !== row.hash) {
          return {
            valid: false,
            height: rows.length,
            genesisHash,
            tipHash: null,
            brokenAt: row.id_index,
            reason: 'HASH_MISMATCH',
          };
        }

        if (!row.hash.startsWith(REMEMBER_POW_PREFIX)) {
          return {
            valid: false,
            height: rows.length,
            genesisHash,
            tipHash: null,
            brokenAt: row.id_index,
            reason: 'POW_INVALID',
          };
        }

        try {
          JSON.parse(row.observation_json);
          JSON.parse(row.evidence_json);
        } catch {
          return {
            valid: false,
            height: rows.length,
            genesisHash,
            tipHash: null,
            brokenAt: row.id_index,
            reason: 'PARSE_FAILURE',
          };
        }

        if (expectedIndex === REMEMBER_GENESIS_INDEX) genesisHash = row.hash;
        previousHash = row.hash;
        expectedIndex += 1;
      }

      return { valid: true, height: rows.length, genesisHash, tipHash: previousHash };
    } catch {
      return { valid: false, height: 0, genesisHash: null, tipHash: null, reason: 'PARSE_FAILURE' };
    }
  }

  public verifyIntegrity(): boolean {
    return this.verifyChain().valid;
  }

  /**
   * Verification-gated tip. Observation of a row is not enough.
   */
  public getVerifiedTip(): IMiniBlock | null {
    const integrity = this.verifyChain();
    if (!integrity.valid) {
      throw new Error(`ledger integrity degraded: ${integrity.reason ?? 'UNKNOWN'}`);
    }
    return this.getTip();
  }

  public append(observation: IObservation, evidence: IEvidence, options: { signal?: AbortSignal } = {}): IMiniBlock {
    const integrity = this.verifyChain();
    if (!integrity.valid) {
      throw new Error(`ledger integrity degraded: ${integrity.reason ?? 'UNKNOWN'}`);
    }

    const tip = this.getTip();
    const nextIndex = tip ? tip.index + 1 : REMEMBER_GENESIS_INDEX;
    const previousHash = tip ? tip.hash : this.rootHash;
    const timestamp = new Date().toISOString();
    let nonce = 0,
      blockHash = '';
    const obsStr = JSON.stringify(observation);
    const evStr = JSON.stringify(evidence);
    for (; nonce < MAX_PROOF_OF_WORK_ATTEMPTS; nonce++) {
      if (options.signal?.aborted) {
        throw new Error('proof-of-work aborted before completion');
      }
      blockHash = hashRememberPayload(nextIndex, timestamp, obsStr, evStr, previousHash, nonce);
      if (blockHash.substring(0, 2) === REMEMBER_POW_PREFIX) break;
    }

    if (!blockHash.startsWith(REMEMBER_POW_PREFIX)) {
      throw new Error(`proof-of-work did not complete within ${MAX_PROOF_OF_WORK_ATTEMPTS} attempts`);
    }
    this.db
      .prepare(
        `INSERT INTO ledger (id_index, timestamp, observation_json, evidence_json, previous_hash, hash, nonce) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(nextIndex, timestamp, obsStr, evStr, previousHash, blockHash, nonce);
    return {
      index: nextIndex,
      timestamp,
      observation,
      evidence,
      previousHash,
      hash: blockHash,
      nonce,
    };
  }

  public close(): void {
    this.db.close?.();
  }
}

export * from './ledger.js';
