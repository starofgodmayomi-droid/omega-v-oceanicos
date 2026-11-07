import { randomUUID } from 'node:crypto';
import { openDatabase, type SqliteDb } from './sqlite.js';
import type { AuthorityLevel } from './invisible-computer.js';

/*
 * KAI — the memory of the Invisible Online Computer.
 *
 * Two durable tables:
 *   KaiMemory         — what was asked, the SHA-256 evidence, and the verdict.
 *   OmegaIR_Contracts — the bounded contract each intent is verified against.
 *
 * MEMORY != PROOF: a row records that a verification happened; it does not
 * make the intent true. The row keeps a pointer to its contract so the
 * `Expected ≡ Observed` comparison can be reconciled after the fact.
 */

export type KaiMemoryRecord = {
  id: string;
  timestamp: string;
  intent: string;
  evidence_hash: string;
  status: string;
  contract_id: string | null;
};

export type OmegaContract = {
  id: string;
  intent: string;
  authority_level: AuthorityLevel;
  expected_outcome: string;
  /** The phase the caller declared when the cycle ran; null when none was sent. */
  phase_t: number | null;
  phase_label: string | null;
  ease_factor: number | null;
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
        contract_id TEXT
      );
      CREATE INDEX IF NOT EXISTS "KaiMemory_timestamp_idx" ON "KaiMemory" (timestamp DESC);
      CREATE TABLE IF NOT EXISTS "OmegaIR_Contracts" (
        id TEXT PRIMARY KEY,
        intent TEXT NOT NULL,
        authority_level TEXT NOT NULL,
        expected_outcome TEXT NOT NULL,
        phase_t REAL,
        phase_label TEXT,
        ease_factor REAL
      );
      CREATE INDEX IF NOT EXISTS "OmegaIR_Contracts_intent_idx" ON "OmegaIR_Contracts" (intent);
    `);
    // Additive migration for rows written before the contract pointer existed.
    const memoryColumns = this.db.prepare('PRAGMA table_info("KaiMemory")').all() as Array<{
      name: string;
    }>;
    if (!memoryColumns.some((column) => column.name === 'contract_id')) {
      this.db.exec('ALTER TABLE "KaiMemory" ADD COLUMN contract_id TEXT');
    }
    // Additive migration: contracts written before the phase was recorded keep
    // NULL there, and a reconciliation reads that as "no phase was declared".
    const contractColumns = this.db.prepare('PRAGMA table_info("OmegaIR_Contracts")').all() as Array<{
      name: string;
    }>;
    for (const column of ['phase_t', 'phase_label', 'ease_factor'] as const) {
      if (!contractColumns.some((existing) => existing.name === column)) {
        const type = column === 'phase_label' ? 'TEXT' : 'REAL';
        this.db.exec(`ALTER TABLE "OmegaIR_Contracts" ADD COLUMN ${column} ${type}`);
      }
    }
  }

  createContract(input: {
    intent: string;
    authorityLevel: AuthorityLevel;
    expectedOutcome: string;
    phaseT?: number | null;
    phaseLabel?: string | null;
    easeFactor?: number | null;
  }): OmegaContract {
    const contract: OmegaContract = {
      id: randomUUID(),
      intent: input.intent,
      authority_level: input.authorityLevel,
      expected_outcome: input.expectedOutcome,
      phase_t: input.phaseT ?? null,
      phase_label: input.phaseLabel ?? null,
      ease_factor: input.easeFactor ?? null,
    };
    this.db
      .prepare(
        'INSERT INTO "OmegaIR_Contracts" (id, intent, authority_level, expected_outcome, phase_t, phase_label, ease_factor) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        contract.id,
        contract.intent,
        contract.authority_level,
        contract.expected_outcome,
        contract.phase_t,
        contract.phase_label,
        contract.ease_factor
      );
    return contract;
  }

  getContract(id: string): OmegaContract | null {
    const row = this.db
      .prepare(
        'SELECT id, intent, authority_level, expected_outcome, phase_t, phase_label, ease_factor FROM "OmegaIR_Contracts" WHERE id = ?'
      )
      .get(id) as OmegaContract | undefined;
    return row ?? null;
  }

  remember(input: {
    intent: string;
    evidenceHash: string;
    status: string;
    contractId?: string | null;
  }): KaiMemoryRecord {
    const record: KaiMemoryRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      intent: input.intent,
      evidence_hash: input.evidenceHash,
      status: input.status,
      contract_id: input.contractId ?? null,
    };
    this.db
      .prepare(
        'INSERT INTO "KaiMemory" (id, timestamp, intent, evidence_hash, status, contract_id) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        record.id,
        record.timestamp,
        record.intent,
        record.evidence_hash,
        record.status,
        record.contract_id
      );
    return record;
  }

  listMemory(limit = 10): KaiMemoryRecord[] {
    const bounded = Math.min(Math.max(Math.trunc(limit) || 10, 1), 50);
    return this.db
      .prepare(
        'SELECT id, timestamp, intent, evidence_hash, status, contract_id FROM "KaiMemory" ORDER BY timestamp DESC, rowid DESC LIMIT ?'
      )
      .all(bounded) as KaiMemoryRecord[];
  }

  getMemory(id: string): KaiMemoryRecord | null {
    const row = this.db
      .prepare(
        'SELECT id, timestamp, intent, evidence_hash, status, contract_id FROM "KaiMemory" WHERE id = ?'
      )
      .get(id) as KaiMemoryRecord | undefined;
    return row ?? null;
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
