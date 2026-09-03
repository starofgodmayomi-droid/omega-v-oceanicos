import Database from 'better-sqlite3';
import { EventLogEntry, Observation, VerificationResult, Attestation } from '@omega-v/types';
import crypto from 'crypto';

export interface PersistenceConfig {
  dbPath?: string;
  inMemory?: boolean;
}

export class SQLiteEventLog {
  private db: Database.Database;
  private initialized = false;

  constructor(config: PersistenceConfig = {}) {
    const dbPath = config.inMemory ? ':memory:' : config.dbPath || './events.db';
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        hash TEXT NOT NULL UNIQUE,
        previousHash TEXT,
        recordedAt TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_recordedAt ON events(recordedAt);
      CREATE INDEX IF NOT EXISTS idx_hash ON events(hash);
    `);

    this.initialized = true;
  }

  recordObservation(observation: Observation): EventLogEntry {
    return this.recordEvent('OBSERVATION', observation);
  }

  recordVerification(verification: VerificationResult): EventLogEntry {
    return this.recordEvent('VERIFICATION', verification);
  }

  recordAttestation(attestation: Attestation): EventLogEntry {
    return this.recordEvent('ATTESTATION', attestation);
  }

  private recordEvent(
    type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION',
    data: any
  ): EventLogEntry {
    const recordedAt = new Date().toISOString();
    const lastEvent = this.getLastEvent();
    const previousHash = lastEvent?.hash || '';

    const eventData = { ...data, recordedAt };
    const hash = this.computeHash(JSON.stringify(eventData), previousHash);

    const stmt = this.db.prepare(`
      INSERT INTO events (type, data, hash, previousHash, recordedAt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      type,
      JSON.stringify(eventData),
      hash,
      previousHash,
      recordedAt,
      new Date().toISOString()
    );

    return {
      id: this.db.prepare('SELECT last_insert_rowid() as id').get() as any,
      type,
      data: eventData,
      hash,
      previousHash,
      recordedAt,
    };
  }

  private getLastEvent(): EventLogEntry | null {
    const stmt = this.db.prepare(`
      SELECT * FROM events ORDER BY id DESC LIMIT 1
    `);
    const row = stmt.get() as any;

    if (!row) return null;

    return {
      id: row.id,
      type: row.type,
      data: JSON.parse(row.data),
      hash: row.hash,
      previousHash: row.previousHash,
      recordedAt: row.recordedAt,
    };
  }

  queryByType(
    type: string,
    limit = 50,
    offset = 0
  ): { events: EventLogEntry[]; totalCount: number; pagination: any } {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM events WHERE type = ?');
    const totalCount = (countStmt.get(type) as any).count;

    const stmt = this.db.prepare(`
      SELECT * FROM events WHERE type = ? ORDER BY id DESC LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(type, limit, offset) as any[];

    const events = rows.map((row) => ({
      id: row.id,
      type: row.type,
      data: JSON.parse(row.data),
      hash: row.hash,
      previousHash: row.previousHash,
      recordedAt: row.recordedAt,
    }));

    return {
      events,
      totalCount,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    };
  }

  queryById(id: string | number): EventLogEntry | null {
    const stmt = this.db.prepare('SELECT * FROM events WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      type: row.type,
      data: JSON.parse(row.data),
      hash: row.hash,
      previousHash: row.previousHash,
      recordedAt: row.recordedAt,
    };
  }

  getTraceForObservation(observationId: string): {
    observation: EventLogEntry | null;
    verifications: EventLogEntry[];
    attestations: EventLogEntry[];
  } {
    const obsStmt = this.db.prepare(`
      SELECT * FROM events WHERE type = 'OBSERVATION' AND json_extract(data, '$.id') = ?
    `);
    const observation = obsStmt.get(observationId) as any;

    if (!observation) {
      return { observation: null, verifications: [], attestations: [] };
    }

    const parsedObs = {
      id: observation.id,
      type: observation.type,
      data: JSON.parse(observation.data),
      hash: observation.hash,
      previousHash: observation.previousHash,
      recordedAt: observation.recordedAt,
    };

    const verStmt = this.db.prepare(`
      SELECT * FROM events WHERE type = 'VERIFICATION' AND json_extract(data, '$.observationId') = ?
    `);
    const verifications = (verStmt.all(observationId) as any[]).map((row) => ({
      id: row.id,
      type: row.type,
      data: JSON.parse(row.data),
      hash: row.hash,
      previousHash: row.previousHash,
      recordedAt: row.recordedAt,
    }));

    const attStmt = this.db.prepare(`
      SELECT * FROM events WHERE type = 'ATTESTATION' AND json_extract(data, '$.observationId') = ?
    `);
    const attestations = (attStmt.all(observationId) as any[]).map((row) => ({
      id: row.id,
      type: row.type,
      data: JSON.parse(row.data),
      hash: row.hash,
      previousHash: row.previousHash,
      recordedAt: row.recordedAt,
    }));

    return { observation: parsedObs, verifications, attestations };
  }

  verifyIntegrity(): { valid: boolean; brokenAt?: number } {
    const stmt = this.db.prepare('SELECT id, data, hash, previousHash FROM events ORDER BY id');
    const events = stmt.all() as any[];

    let previousHash = '';
    for (const event of events) {
      const expectedHash = this.computeHash(event.data, previousHash);
      if (expectedHash !== event.hash) {
        return { valid: false, brokenAt: event.id };
      }
      previousHash = event.hash;
    }

    return { valid: true };
  }

  exportEventLog(): EventLogEntry[] {
    const stmt = this.db.prepare('SELECT * FROM events ORDER BY id');
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      data: JSON.parse(row.data),
      hash: row.hash,
      previousHash: row.previousHash,
      recordedAt: row.recordedAt,
    }));
  }

  private computeHash(data: string, previousHash: string): string {
    const combined = previousHash + data;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  close(): void {
    this.db.close();
  }

  getStats(): { totalEvents: number; byType: Record<string, number> } {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM events');
    const totalEvents = (totalStmt.get() as any).count;

    const typeStmt = this.db.prepare(`
      SELECT type, COUNT(*) as count FROM events GROUP BY type
    `);
    const byType: Record<string, number> = {};
    const rows = typeStmt.all() as any[];
    for (const row of rows) {
      byType[row.type] = row.count;
    }

    return { totalEvents, byType };
  }
}

export default SQLiteEventLog;
