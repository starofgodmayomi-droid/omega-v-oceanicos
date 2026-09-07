import crypto from 'crypto';
import { IMiniBlock, IObservation, IEvidence } from '@oceanicos/types';

interface ISqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...params: any[]): any;
    run(...params: any[]): any;
  };
}

export class RememberEngine {
  private db: ISqliteDatabase;
  private readonly rootHash = '8a3f91c2e4f9011b989210ffffffffff';

  constructor(dbPath: string = 'oceanicos.db') {
    try {
      const BetterSqlite = require('better-sqlite3');
      this.db = new BetterSqlite(dbPath);
    } catch {
      // Fallback to Node.js native SQLite DatabaseSync for platforms without C++ build tools
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(dbPath);
    }
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ledger (
        id_index INTEGER PRIMARY KEY,
        timestamp TEXT NOT NULL,
        observation_json TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        previous_hash TEXT NOT NULL,
        hash TEXT NOT NULL,
        nonce INTEGER NOT NULL
      );
    `);
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

  public append(observation: IObservation, evidence: IEvidence): IMiniBlock {
    const tip = this.getTip();
    const nextIndex = tip ? tip.index + 1 : 4101;
    const prevHash = tip ? tip.hash : this.rootHash;
    const timestamp = new Date().toISOString();
    let nonce = 0;
    let blockHash = '';
    const obsStr = JSON.stringify(observation);
    const evStr = JSON.stringify(evidence);

    while (true) {
      blockHash = crypto
        .createHash('sha256')
        .update(`${nextIndex}-${timestamp}-${obsStr}-${evStr}-${prevHash}-${nonce}`)
        .digest('hex');
      if (blockHash.substring(0, 2) === '00') break;
      nonce++;
    }

    this.db
      .prepare(
        `
      INSERT INTO ledger (id_index, timestamp, observation_json, evidence_json, previous_hash, hash, nonce)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(nextIndex, timestamp, obsStr, evStr, prevHash, blockHash, nonce);

    return {
      index: nextIndex,
      timestamp,
      observation,
      evidence,
      previousHash: prevHash,
      hash: blockHash,
      nonce,
    };
  }
}
