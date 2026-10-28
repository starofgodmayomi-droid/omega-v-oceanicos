import { randomUUID } from 'node:crypto';
import { openDatabase, type SqliteDb } from './omega-persistence.js';

/**
 * KAI — the memory.
 *
 * Two tables, both explicit about their evidence boundary:
 * - KaiMemory keeps the intent, the SHA-256 evidence hash, and the verdict.
 * - OmegaIR keeps the contract that bounded each execution.
 *
 * A record is written for every outcome, including DIVERGENT and UNKNOWN, so
 * the absence of evidence is remembered as clearly as its presence.
 */
export type KaiStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
export type AuthorityLimit = 'READ_ONLY' | 'AUTONOMOUS';

export type KaiMemoryRecord = {
  id: string;
  timestamp: string;
  intent: string;
  evidenceHash: string | null;
  status: KaiStatus;
};

export type OmegaIRRecord = {
  id: string;
  scope: string;
  authorityLimit: AuthorityLimit;
  expectedOutcome: string;
};

type KaiMemoryRow = {
  id: string;
  timestamp: string;
  intent: string;
  evidence_hash: string | null;
  status: string;
};

type OmegaIRRow = {
  id: string;
  scope: string;
  authority_limit: string;
  expected_outcome: string;
};

export class KaiMemoryStore {
  private readonly db: SqliteDb;

  constructor(path = ':memory:') {
    this.db = openDatabase(path);
    this.db.exec(`
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS KaiMemory (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        intent TEXT NOT NULL,
        evidence_hash TEXT,
        status TEXT NOT NULL CHECK (status IN ('VERIFIED', 'DIVERGENT', 'UNKNOWN'))
      );
      CREATE TABLE IF NOT EXISTS OmegaIR (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        authority_limit TEXT NOT NULL CHECK (authority_limit IN ('READ_ONLY', 'AUTONOMOUS')),
        expected_outcome TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS kai_memory_timestamp ON KaiMemory(timestamp DESC);
      CREATE INDEX IF NOT EXISTS omega_ir_scope ON OmegaIR(scope);
    `);
  }

  remember(entry: { intent: string; evidenceHash: string | null; status: KaiStatus }): KaiMemoryRecord {
    const record: KaiMemoryRecord = {
      id: `kai-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      intent: entry.intent,
      evidenceHash: entry.evidenceHash,
      status: entry.status,
    };
    this.db
      .prepare('INSERT INTO KaiMemory (id, timestamp, intent, evidence_hash, status) VALUES (?, ?, ?, ?, ?)')
      .run(record.id, record.timestamp, record.intent, record.evidenceHash, record.status);
    return record;
  }

  rememberContract(entry: {
    scope: string;
    authorityLimit: AuthorityLimit;
    expectedOutcome: string;
  }): OmegaIRRecord {
    const record: OmegaIRRecord = {
      id: `ir-${randomUUID()}`,
      scope: entry.scope,
      authorityLimit: entry.authorityLimit,
      expectedOutcome: entry.expectedOutcome,
    };
    this.db
      .prepare('INSERT INTO OmegaIR (id, scope, authority_limit, expected_outcome) VALUES (?, ?, ?, ?)')
      .run(record.id, record.scope, record.authorityLimit, record.expectedOutcome);
    return record;
  }

  recentMemory(limit = 20): readonly KaiMemoryRecord[] {
    const bounded = Math.max(1, Math.min(100, Math.trunc(limit)));
    return (this.db
      .prepare('SELECT id, timestamp, intent, evidence_hash, status FROM KaiMemory ORDER BY timestamp DESC LIMIT ?')
      .all(bounded) as KaiMemoryRow[]).map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      intent: row.intent,
      evidenceHash: row.evidence_hash,
      status: row.status as KaiStatus,
    }));
  }

  recentContracts(limit = 20): readonly OmegaIRRecord[] {
    const bounded = Math.max(1, Math.min(100, Math.trunc(limit)));
    return (this.db
      .prepare('SELECT id, scope, authority_limit, expected_outcome FROM OmegaIR LIMIT ?')
      .all(bounded) as OmegaIRRow[]).map((row) => ({
      id: row.id,
      scope: row.scope,
      authorityLimit: row.authority_limit as AuthorityLimit,
      expectedOutcome: row.expected_outcome,
    }));
  }

  close(): void {
    this.db.close?.();
  }
}
