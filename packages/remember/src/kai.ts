import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  KaiMemoryDistinction,
  KaiProvenanceRecord,
  KaiIntegrityReport,
} from '@oceanicos/types';

export const KAI_GENESIS_HASH = '8a3f91c2e4f9011b989210ffffffffff';
export const KAI_GENESIS_ID = 'kai-genesis-0';

export const VALID_DISTINCTIONS: readonly KaiMemoryDistinction[] = [
  'OBSERVED',
  'USER-STATED',
  'DOCUMENTED',
  'INFERRED',
  'PROPOSED',
  'VERIFIED',
  'DIVERGENT',
  'UNKNOWN',
  'BLOCKED',
  'NOT-AUTHORIZED',
  'CORRECTED',
] as const;

export interface KaiAppendInput {
  distinction: KaiMemoryDistinction;
  statement: string;
  subject: string;
  source: string;
  author: string;
  policyOrAuthority?: string;
  evidenceRef?: string;
  inferredSourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface KaiQueryFilter {
  distinction?: KaiMemoryDistinction;
  subject?: string;
  author?: string;
  limit?: number;
}

export class ConstitutionSection13Violation extends Error {
  constructor(message: string) {
    super(`[CONSTITUTION §13 VIOLATION] ${message}`);
    this.name = 'ConstitutionSection13Violation';
  }
}

/**
 * KaiLedger: Memory, knowledge, continuity, and provenance engine for Ω∞v Oceanicos.
 * Implements Constitution §13:
 *   - Hash-chain model: hashₙ = H(recordₙ + hashₙ₋₁)
 *   - 11 explicit store distinctions
 *   - Hard invariant: Never silently convert INFERRED → OBSERVED.
 */
export class KaiLedger {
  private records: KaiProvenanceRecord[] = [];
  private readonly filePath?: string;

  constructor(filePath?: string) {
    this.filePath = filePath;
    if (this.filePath && this.filePath !== ':memory:') {
      this.loadFromFile();
    }
    if (this.records.length === 0) {
      this.mintGenesisRecord();
    }
  }

  private mintGenesisRecord(): void {
    const genesisRecord: KaiProvenanceRecord = {
      id: KAI_GENESIS_ID,
      index: 0,
      timestamp: '2026-09-06T14:15:00.000Z',
      distinction: 'VERIFIED',
      statement: 'KAI genesis: memory, continuity, context, and provenance initialized',
      subject: 'kai:kernel',
      source: 'constitution:section-13',
      author: 'oceanicos:genesis',
      policyOrAuthority: 'CONSTITUTION §13',
      previousHash: KAI_GENESIS_HASH,
      hash: this.calculateRecordHash(0, '2026-09-06T14:15:00.000Z', 'VERIFIED', 'kai:kernel', 'KAI genesis: memory, continuity, context, and provenance initialized', KAI_GENESIS_HASH),
      metadata: { root: true },
    };
    this.records.push(genesisRecord);
  }

  private loadFromFile(): void {
    if (!this.filePath || this.filePath === ':memory:') return;
    try {
      if (fs.existsSync(this.filePath)) {
        const lines = fs.readFileSync(this.filePath, 'utf8').split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as KaiProvenanceRecord;
            this.records.push(parsed);
          } catch {
            // Ignore malformed lines on cold start
          }
        }
      }
    } catch {
      // Directory or file unavailable
    }
  }

  private persistRecord(record: KaiProvenanceRecord): void {
    if (!this.filePath || this.filePath === ':memory:') return;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, 'utf8');
    } catch {
      // Best effort file append
    }
  }

  public calculateRecordHash(
    index: number,
    timestamp: string,
    distinction: KaiMemoryDistinction,
    subject: string,
    statement: string,
    previousHash: string
  ): string {
    const raw = `${index}|${timestamp}|${distinction}|${subject}|${statement}|${previousHash}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Append a new KAI provenance record.
   * Enforces Constitution §13 invariants.
   */
  public append(input: KaiAppendInput): KaiProvenanceRecord {
    if (!VALID_DISTINCTIONS.includes(input.distinction)) {
      throw new Error(`Invalid KAI distinction: '${input.distinction}'`);
    }

    if (!input.statement || !input.statement.trim()) {
      throw new Error('KAI statement must be a non-empty string');
    }

    if (!input.subject || !input.subject.trim()) {
      throw new Error('KAI subject must be a non-empty string');
    }

    // Constitution §13 check: Never silently convert INFERRED → OBSERVED
    if (input.distinction === 'OBSERVED') {
      if (input.inferredSourceId) {
        throw new ConstitutionSection13Violation(
          `Cannot convert inferred record '${input.inferredSourceId}' directly to OBSERVED. An inference must be attested as VERIFIED or remain INFERRED.`
        );
      }
    }

    const tip = this.records[this.records.length - 1];
    const index = tip ? tip.index + 1 : 1;
    const previousHash = tip ? tip.hash : KAI_GENESIS_HASH;
    const timestamp = new Date().toISOString();
    const id = `kai-${Date.now()}-${index}`;

    const hash = this.calculateRecordHash(
      index,
      timestamp,
      input.distinction,
      input.subject,
      input.statement,
      previousHash
    );

    const record: KaiProvenanceRecord = {
      id,
      index,
      timestamp,
      distinction: input.distinction,
      statement: input.statement,
      subject: input.subject,
      source: input.source,
      author: input.author,
      policyOrAuthority: input.policyOrAuthority,
      evidenceRef: input.evidenceRef,
      previousHash,
      hash,
      metadata: input.metadata,
    };

    this.records.push(record);
    this.persistRecord(record);
    return record;
  }

  /**
   * Transition an INFERRED hypothesis toward verification with evidence.
   * Produces a VERIFIED record maintaining clear provenance lineage.
   */
  public verifyInference(options: {
    inferredRecordId: string;
    evidenceRef: string;
    statement: string;
    author: string;
    policyOrAuthority?: string;
  }): KaiProvenanceRecord {
    const inferred = this.records.find((r) => r.id === options.inferredRecordId);
    if (!inferred) {
      throw new Error(`Inferred record '${options.inferredRecordId}' not found in KAI ledger`);
    }
    if (inferred.distinction !== 'INFERRED') {
      throw new Error(`Record '${options.inferredRecordId}' is '${inferred.distinction}', expected 'INFERRED'`);
    }

    return this.append({
      distinction: 'VERIFIED',
      subject: inferred.subject,
      statement: options.statement,
      source: `verified-inference:${options.inferredRecordId}`,
      author: options.author,
      policyOrAuthority: options.policyOrAuthority,
      evidenceRef: options.evidenceRef,
      metadata: {
        inferredRecordId: options.inferredRecordId,
        inferredStatement: inferred.statement,
      },
    });
  }

  public query(filter: KaiQueryFilter = {}): KaiProvenanceRecord[] {
    let results = [...this.records];
    if (filter.distinction) {
      results = results.filter((r) => r.distinction === filter.distinction);
    }
    if (filter.subject) {
      results = results.filter((r) => r.subject.toLowerCase().includes(filter.subject!.toLowerCase()));
    }
    if (filter.author) {
      results = results.filter((r) => r.author.toLowerCase().includes(filter.author!.toLowerCase()));
    }
    results.reverse();
    if (typeof filter.limit === 'number' && filter.limit > 0) {
      return results.slice(0, filter.limit);
    }
    return results;
  }

  public replay(recordId: string): KaiProvenanceRecord | undefined {
    return this.records.find((r) => r.id === recordId);
  }

  public all(): readonly KaiProvenanceRecord[] {
    return this.records;
  }

  public getTip(): KaiProvenanceRecord | null {
    return this.records[this.records.length - 1] ?? null;
  }

  public verifyIntegrity(): KaiIntegrityReport {
    const distinctionsCount: Record<KaiMemoryDistinction, number> = {
      OBSERVED: 0,
      'USER-STATED': 0,
      DOCUMENTED: 0,
      INFERRED: 0,
      PROPOSED: 0,
      VERIFIED: 0,
      DIVERGENT: 0,
      UNKNOWN: 0,
      BLOCKED: 0,
      'NOT-AUTHORIZED': 0,
      CORRECTED: 0,
    };

    let valid = true;
    for (let i = 0; i < this.records.length; i++) {
      const current = this.records[i];
      distinctionsCount[current.distinction] = (distinctionsCount[current.distinction] || 0) + 1;

      if (i === 0) {
        if (current.id !== KAI_GENESIS_ID || current.previousHash !== KAI_GENESIS_HASH) {
          valid = false;
        }
      } else {
        const prev = this.records[i - 1];
        if (current.previousHash !== prev.hash) {
          valid = false;
        }
      }

      const expectedHash = this.calculateRecordHash(
        current.index,
        current.timestamp,
        current.distinction,
        current.subject,
        current.statement,
        current.previousHash
      );

      if (current.hash !== expectedHash) {
        valid = false;
      }
    }

    return {
      valid,
      count: this.records.length,
      genesisHash: this.records[0]?.hash ?? KAI_GENESIS_HASH,
      tipHash: this.records[this.records.length - 1]?.hash ?? KAI_GENESIS_HASH,
      distinctions: distinctionsCount,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
