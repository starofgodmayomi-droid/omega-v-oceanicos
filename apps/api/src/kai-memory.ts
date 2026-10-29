import { randomUUID } from 'node:crypto';
import { openDatabase, type SqliteDb } from './sqlite.js';
import type { AuthorityLevel } from './invisible-computer.js';

/*
 * KAI — the memory of the Invisible Online Computer.
 *
 * Two durable tables:
 *   KaiMemory        — what was asked, the SHA-256 evidence, the verdict, and
 *                      the evidence text the digest was taken from.
 *   OmegaIR_Contracts — the bounded contract each intent is verified against.
 *
 * MEMORY != PROOF: a row records that a verification happened; it does not
 * make the intent true. The retained evidence makes a row *replayable* — the
 * digest can be recomputed later and a mismatch reported as DIVERGENT. Rows
 * written before replay existed carry no text and replay as UNKNOWN.
 */

export type KaiMemoryRecord = {
  id: string;
  timestamp: string;
  intent: string;
  evidence_hash: string;
  status: string;
};

export type KaiMemoryEvidenceRecord = KaiMemoryRecord & { evidence_text: string | null };

export type OmegaContract = {
  id: string;
  intent: string;
  authority_level: AuthorityLevel;
  expected_outcome: string;
};

export class KaiMemoryStore {
  private readonly db: SqliteDb;

  constructor(path = ':memory:') {
    this.db = openDatabase(path);
    this.db.exec(`
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS "KaiMemory" (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        intent TEXT NOT NULL,
        evidence_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        evidence_text TEXT
      );
      CREATE INDEX IF NOT EXISTS "KaiMemory_timestamp_idx" ON "KaiMemory" (timestamp DESC);
      CREATE TABLE IF NOT EXISTS "OmegaIR_Contracts" (
        id TEXT PRIMARY KEY,
        intent TEXT NOT NULL,
        authority_level TEXT NOT NULL,
        expected_outcome TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "OmegaIR_Contracts_intent_idx" ON "OmegaIR_Contracts" (intent);
    `);

    // Additive and nullable, so a database written before replay existed keeps
    // its rows and verdicts; those rows replay as UNKNOWN rather than being
    // rewritten. CREATE TABLE IF NOT EXISTS alone cannot add the column.
    const columns = this.db.prepare('PRAGMA table_info("KaiMemory")').all() as Array<{
      name?: string;
    }>;
    if (!columns.some((column) => column?.name === 'evidence_text')) {
      this.db.exec('ALTER TABLE "KaiMemory" ADD COLUMN evidence_text TEXT');
    }
  }

  createContract(input: {
    intent: string;
    authorityLevel: AuthorityLevel;
    expectedOutcome: string;
  }): OmegaContract {
    const contract: OmegaContract = {
      id: randomUUID(),
      intent: input.intent,
      authority_level: input.authorityLevel,
      expected_outcome: input.expectedOutcome,
    };
    this.db
      .prepare(
        'INSERT INTO "OmegaIR_Contracts" (id, intent, authority_level, expected_outcome) VALUES (?, ?, ?, ?)'
      )
      .run(
        contract.id,
        contract.intent,
        contract.authority_level,
        contract.expected_outcome
      );
    return contract;
  }

  remember(input: {
    intent: string;
    evidenceHash: string;
    status: string;
    evidenceText?: string | null;
  }): KaiMemoryRecord {
    const record: KaiMemoryRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      intent: input.intent,
      evidence_hash: input.evidenceHash,
      status: input.status,
    };
    this.db
      .prepare(
        'INSERT INTO "KaiMemory" (id, timestamp, intent, evidence_hash, status, evidence_text) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        record.id,
        record.timestamp,
        record.intent,
        record.evidence_hash,
        record.status,
        input.evidenceText ?? null
      );
    return record;
  }

  /** One record with the evidence text retained for replay. */
  findMemory(id: string): KaiMemoryEvidenceRecord | null {
    const row = this.db
      .prepare(
        'SELECT id, timestamp, intent, evidence_hash, status, evidence_text FROM "KaiMemory" WHERE id = ?'
      )
      .get(id) as KaiMemoryEvidenceRecord | undefined;
    return row ?? null;
  }

  /** Records with the retained evidence text, newest first, for a ledger audit. */
  listEvidence(limit = 50): KaiMemoryEvidenceRecord[] {
    const bounded = Math.min(Math.max(Math.trunc(limit) || 50, 1), 50);
    return this.db
      .prepare(
        'SELECT id, timestamp, intent, evidence_hash, status, evidence_text FROM "KaiMemory" ORDER BY timestamp DESC, rowid DESC LIMIT ?'
      )
      .all(bounded) as KaiMemoryEvidenceRecord[];
  }

  listMemory(limit = 10): KaiMemoryRecord[] {
    const bounded = Math.min(Math.max(Math.trunc(limit) || 10, 1), 50);
    return this.db
      .prepare(
        'SELECT id, timestamp, intent, evidence_hash, status FROM "KaiMemory" ORDER BY timestamp DESC, rowid DESC LIMIT ?'
      )
      .all(bounded) as KaiMemoryRecord[];
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS total FROM "KaiMemory"').get() as
      | { total: number }
      | undefined;
    return Number(row?.total ?? 0);
  }

  close(): void {
    this.db.close?.();
  }
}
