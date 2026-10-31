/**
 * Ω∞v Body Command — the KAI / ELION / OMEGA fixpoint over HTTP.
 *
 * POST /v1/body/execute is one turn of the law in `@oceanicos/omega`:
 *
 *   f(Σ ∪ Hash(x))        if O(E(x)) ≡ VERIFIED
 *   HALT ⊢ DIVERGENT      if K(x) ∈ SCAM
 *   HALT ⊢ UNKNOWN        if Evidence(x) = ∅
 *   HALT ⊢ NOT_EXECUTED   if Authority(x) < Required
 *
 *   1. KAI Shield screens the intent (fail-closed; UNKNOWN is preserved).
 *   2. ELION executes only with the operator's explicit command as authorization.
 *   3. OMEGA reconciles the executed record against the declared one.
 *   4. KAI appends the transition; only a VERIFIED delta joins Σ (memory).
 *
 * Scope: the engine is a label and the execution is local. No external model is
 * called, no deployment happens, and a VERIFIED status is digest reconciliation
 * of declared values — not proof of external reality. The journal and memory are
 * in-memory, bounded at 256 entries, and reset on restart.
 */
import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { evaluateIntent } from '@oceanicos/kai';
import { executeAuthorized } from '@oceanicos/elion';
import { stepFixpoint } from '@oceanicos/omega';
import type { FixpointVerdict } from '@oceanicos/omega';

export const BODY_JOURNAL_CAPACITY = 256;
export const BODY_INTENT_MAX_LENGTH = 2000;

export type BodyTransitionStatus = FixpointVerdict;

export interface BodyJournalEntry {
  readonly seq: number;
  readonly time: string;
  readonly intent: string;
  readonly engine: string;
  readonly operator: string;
  readonly status: BodyTransitionStatus;
  readonly reason: string;
  readonly hash: string;
  readonly previousHash: string;
}

export interface BodyJournalAppend {
  readonly intent: string;
  readonly engine: string;
  readonly operator: string;
  readonly status: BodyTransitionStatus;
  readonly reason: string;
}

const hashEntry = (
  previousHash: string,
  seq: number,
  time: string,
  input: BodyJournalAppend,
): string =>
  createHash('sha256')
    .update(
      `${previousHash}|${seq}|${time}|${input.intent}|${input.engine}|${input.operator}|${input.status}|${input.reason}`,
    )
    .digest('hex');

export class BodyCommandJournal {
  private readonly entries: BodyJournalEntry[] = [];
  private memory: string[] = [];
  private dropped = 0;
  private memoryDropped = 0;

  public append(input: BodyJournalAppend): BodyJournalEntry {
    const previousHash = this.entries[this.entries.length - 1]?.hash ?? '0'.repeat(64);
    const seq = this.entries.length + this.dropped + 1;
    const time = new Date().toISOString();
    const entry: BodyJournalEntry = {
      seq,
      time,
      ...input,
      previousHash,
      hash: hashEntry(previousHash, seq, time, input),
    };
    this.entries.push(entry);
    if (this.entries.length > BODY_JOURNAL_CAPACITY) {
      this.entries.shift();
      this.dropped += 1;
    }
    return entry;
  }

  /**
   * Σ — the digests of deltas that reconciled. Set union, bounded like the
   * journal; dropping an old digest is reported, never silent.
   */
  public setMemory(next: readonly string[]): void {
    this.memory = [...next];
    while (this.memory.length > BODY_JOURNAL_CAPACITY) {
      this.memory.shift();
      this.memoryDropped += 1;
    }
  }

  public memoryState(): readonly string[] {
    return [...this.memory];
  }

  public all(): readonly BodyJournalEntry[] {
    return [...this.entries];
  }

  public status() {
    return {
      count: this.entries.length,
      capacity: BODY_JOURNAL_CAPACITY,
      dropped: this.dropped,
      durable: false as const,
      tip: this.entries[this.entries.length - 1]?.hash ?? null,
      memory: {
        count: this.memory.length,
        capacity: BODY_JOURNAL_CAPACITY,
        dropped: this.memoryDropped,
        tip: this.memory[this.memory.length - 1] ?? null,
      },
    };
  }
}

type ExecuteBody = {
  intent?: unknown;
  engine?: unknown;
  operator?: unknown;
};

const asLabel = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 80) : fallback;

export function registerBodyCommandRoute(
  fastify: FastifyInstance,
  journal: BodyCommandJournal,
): void {
  fastify.post('/v1/body/execute', async (request, reply) => {
    const body = (request.body ?? {}) as ExecuteBody;
    const intent = typeof body.intent === 'string' ? body.intent.trim() : '';
    const engine = asLabel(body.engine, 'unspecified');
    const declaredOperator = body.operator;
    // Absent operator → the dashboard's default declaration. Present but empty
    // or non-textual → Authority(x) < Required, and the hands do not move.
    const authorityDeclared =
      declaredOperator === undefined ||
      (typeof declaredOperator === 'string' && declaredOperator.trim().length > 0);
    const operator = asLabel(declaredOperator, 'dashboard-operator');

    if (!intent) {
      return reply.status(400).send({
        success: false,
        status: 'UNKNOWN',
        reason: 'No intent provided.',
      });
    }

    if (intent.length > BODY_INTENT_MAX_LENGTH) {
      return reply.status(400).send({
        success: false,
        status: 'UNKNOWN',
        reason: `Intent exceeds ${BODY_INTENT_MAX_LENGTH} characters.`,
      });
    }

    const shield = evaluateIntent(intent);
    const executedAt = new Date().toISOString();

    const turn = await stepFixpoint(
      {
        value: { intent, engine },
        scam: shield.status === 'BLOCKED',
        evidence: shield.status !== 'UNKNOWN',
        authority: authorityDeclared,
        execute: async () => {
          const execution = await executeAuthorized({
            intent,
            authorization: {
              approvedBy: operator,
              approvedAt: executedAt,
              scope: 'v1/body/execute',
            },
            handler: () => ({ intent, engine }),
          });
          if (execution.status !== 'EXECUTED' || execution.observed === undefined) {
            throw new Error(execution.reason);
          }
          return execution.observed;
        },
      },
      journal.memoryState(),
    );

    journal.setMemory(turn.memory);

    // 1. KAI Shield — declared patterns only; a CLEAR result is not consent.
    if (turn.verdict === 'DIVERGENT' && !turn.executed) {
      const entry = journal.append({
        intent,
        engine,
        operator,
        status: 'DIVERGENT',
        reason: `KAI_SHIELD: ${shield.reason}`,
      });
      return reply.status(403).send({
        success: false,
        status: 'DIVERGENT',
        phase: 'KAI_SHIELD',
        reason: shield.reason,
        findings: shield.findings,
        ledger: entry,
      });
    }

    // 3. Authority below the requirement — no execution happened.
    if (turn.verdict === 'NOT_EXECUTED') {
      const entry = journal.append({
        intent,
        engine,
        operator,
        status: 'NOT_EXECUTED',
        reason: turn.reason,
      });
      return reply.status(403).send({
        success: false,
        status: 'NOT_EXECUTED',
        phase: 'ELION',
        reason: turn.reason,
        ledger: entry,
      });
    }

    const entry = journal.append({
      intent,
      engine,
      operator,
      status: turn.verdict,
      reason: turn.reason,
    });

    if (turn.verdict === 'UNKNOWN') {
      return reply.status(500).send({
        success: false,
        status: 'UNKNOWN',
        phase: turn.executed ? 'OMEGA' : 'ELION',
        reason: turn.reason,
        ledger: entry,
      });
    }

    const verified = turn.verdict === 'VERIFIED';

    return reply.status(200).send({
      success: true,
      status: turn.verdict,
      phase: verified ? 'KAI_REMEMBER' : 'OMEGA',
      engine,
      mock: true,
      executed_at: executedAt,
      response: verified ? `Verified execution of: "${intent}"` : null,
      evidence_hash: entry.hash,
      fixpoint: {
        executed: turn.executed,
        delta: turn.delta,
        remembered: turn.remembered,
        memory_count: turn.memory.length,
      },
      verification: turn.verification,
      ledger: entry,
    });
  });

  fastify.get('/v1/body/ledger', async () => ({
    success: true,
    note: 'In-memory transition journal. Bounded, not durable, and not an external-reality claim.',
    ...journal.status(),
    entries: journal.all(),
  }));
}
