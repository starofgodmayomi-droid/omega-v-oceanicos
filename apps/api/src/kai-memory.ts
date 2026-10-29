import { randomUUID } from 'node:crypto';
import { openDatabase, type SqliteDb } from './sqlite.js';
import type { AuthorityLevel } from './invisible-computer.js';

/*
 * KAI — the memory of the Invisible Online Computer.
 *
 * Two durable tables:
 *   KaiMemory        — what was asked, the SHA-256 evidence, and the verdict.
 *   OmegaIR_Contracts — the bounded contract each intent is verified against.
 *
 * MEMORY != PROOF: a row records that a verification happened; it does not
 * make the intent true.
 */

export type KaiMemoryRecord = {
  id: string;
  timestamp: string;
  intent: string;
  evidence_hash: string;
  status: string;
};

export type OmegaContract = {
  id: string;
  intent: string;
  authority_level: AuthorityLevel;
  expected_outcome: string;
};

export type ApprovalStatus = 'PENDING' | 'AUTHORIZED' | 'REJECTED';

export type ApprovalRecord = {
  id: string;
  timestamp: string;
  intent: string;
  gate: string;
  contract_id: string;
  status: ApprovalStatus;
  decided_at: string | null;
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
        status TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "KaiMemory_timestamp_idx" ON "KaiMemory" (timestamp DESC);
      CREATE TABLE IF NOT EXISTS "OmegaIR_Contracts" (
        id TEXT PRIMARY KEY,
        intent TEXT NOT NULL,
        authority_level TEXT NOT NULL,
        expected_outcome TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "OmegaIR_Contracts_intent_idx" ON "OmegaIR_Contracts" (intent);
      CREATE TABLE IF NOT EXISTS "KaiApprovals" (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        intent TEXT NOT NULL,
        gate TEXT NOT NULL,
        contract_id TEXT NOT NULL,
        status TEXT NOT NULL,
        decided_at TEXT
      );
      CREATE INDEX IF NOT EXISTS "KaiApprovals_status_idx" ON "KaiApprovals" (status);
    `);
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

  getContract(id: string): OmegaContract | null {
    const row = this.db
      .prepare(
        'SELECT id, intent, authority_level, expected_outcome FROM "OmegaIR_Contracts" WHERE id = ?'
      )
      .get(id) as OmegaContract | undefined;
    return row ?? null;
  }

  remember(input: { intent: string; evidenceHash: string; status: string }): KaiMemoryRecord {
    const record: KaiMemoryRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      intent: input.intent,
      evidence_hash: input.evidenceHash,
      status: input.status,
    };
    this.db
      .prepare(
        'INSERT INTO "KaiMemory" (id, timestamp, intent, evidence_hash, status) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        record.id,
        record.timestamp,
        record.intent,
        record.evidence_hash,
        record.status
      );
    return record;
  }

  /**
   * Phase 2 — a paused irreversible intent waits here for a human decision.
   * The row is what makes authorization a real, single-use step rather than a
   * flag the caller can set again.
   */
  createApproval(input: { intent: string; gate: string; contractId: string }): ApprovalRecord {
    const record: ApprovalRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      intent: input.intent,
      gate: input.gate,
      contract_id: input.contractId,
      status: 'PENDING',
      decided_at: null,
    };
    this.db
      .prepare(
        'INSERT INTO "KaiApprovals" (id, timestamp, intent, gate, contract_id, status, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        record.id,
        record.timestamp,
        record.intent,
        record.gate,
        record.contract_id,
        record.status,
        record.decided_at
      );
    return record;
  }

  getApproval(id: string): ApprovalRecord | null {
    const row = this.db
      .prepare(
        'SELECT id, timestamp, intent, gate, contract_id, status, decided_at FROM "KaiApprovals" WHERE id = ?'
      )
      .get(id) as ApprovalRecord | undefined;
    return row ?? null;
  }

  /**
   * The approvals still waiting on a human. They are listed apart from
   * KaiMemory because nothing is remembered until one is authorized.
   */
  listPendingApprovals(limit = 10): ApprovalRecord[] {
    const bounded = Math.min(Math.max(Math.trunc(limit) || 10, 1), 50);
    return this.db
      .prepare(
        'SELECT id, timestamp, intent, gate, contract_id, status, decided_at FROM "KaiApprovals" WHERE status = ? ORDER BY timestamp DESC, rowid DESC LIMIT ?'
      )
      .all('PENDING', bounded) as ApprovalRecord[];
  }

  countPendingApprovals(): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS total FROM "KaiApprovals" WHERE status = ?')
      .get('PENDING') as { total: number } | undefined;
    return Number(row?.total ?? 0);
  }

  /** Single use: only a PENDING approval can be decided, once. */
  decideApproval(id: string, decision: 'AUTHORIZED' | 'REJECTED'): ApprovalRecord | null {
    const result = this.db
      .prepare(
        'UPDATE "KaiApprovals" SET status = ?, decided_at = ? WHERE id = ? AND status = ?'
      )
      .run(decision, new Date().toISOString(), id, 'PENDING');
    if (!result?.changes) return null;
    return this.getApproval(id);
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
