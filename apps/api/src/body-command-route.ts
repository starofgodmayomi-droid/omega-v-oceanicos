/**
 * Ω∞v Body Command — the KAI / ELION / OMEGA loop over HTTP.
 *
 * POST /v1/body/execute
 *   1. KAI Shield screens the intent (fail-closed; UNKNOWN is preserved).
 *   2. ELION executes only with the operator's explicit command as authorization.
 *   3. OMEGA reconciles the authorized record against the executed record.
 *   4. KAI appends the transition to a bounded, in-memory journal.
 *
 * Scope: the engine is a label and the execution is local. No external model is
 * called, no deployment happens, and a VERIFIED status is digest reconciliation
 * of declared values — not proof of external reality. The journal is in-memory
 * and bounded at 256 entries; it is not durable and not an immutable ledger.
 */
import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { evaluateIntent } from '@oceanicos/kai';
import { executeAuthorized } from '@oceanicos/elion';

export const BODY_JOURNAL_CAPACITY = 256;
export const BODY_INTENT_MAX_LENGTH = 2000;

export type BodyTransitionStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

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
  private dropped = 0;

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
    const operator = asLabel(body.operator, 'dashboard-operator');

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

    // 1. KAI Shield — declared patterns only; a CLEAR result is not consent.
    const shield = evaluateIntent(intent);
    if (!shield.allowed) {
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

    // 2. ELION — the operator's command is the authorization; the engine label
    // is all that is requested, and the execution is local.
    const executedAt = new Date().toISOString();
    const execution = await executeAuthorized({
      intent,
      authorization: { approvedBy: operator, approvedAt: executedAt, scope: 'v1/body/execute' },
      expected: { intent, engine },
      handler: () => ({ intent, engine }),
    });

    if (execution.status === 'REFUSED' || execution.status === 'FAILED') {
      const entry = journal.append({
        intent,
        engine,
        operator,
        status: 'UNKNOWN',
        reason: execution.reason,
      });
      return reply.status(500).send({
        success: false,
        status: 'UNKNOWN',
        phase: 'ELION',
        reason: execution.reason,
        ledger: entry,
      });
    }

    // 3. OMEGA — reconcile the authorized record against the executed record.
    const observed = execution.observed as { intent: string; engine: string } | undefined;
    const verified =
      execution.verification?.status === 'VERIFIED' &&
      observed?.intent === intent &&
      observed?.engine === engine;
    const status: BodyTransitionStatus = verified ? 'VERIFIED' : 'DIVERGENT';
    const reason = verified
      ? 'OMEGA reconciled the authorized record with the executed record.'
      : execution.reason;

    // 4. KAI — remember the transition.
    const entry = journal.append({ intent, engine, operator, status, reason });

    return reply.status(200).send({
      success: true,
      status,
      phase: 'KAI_REMEMBER',
      engine,
      mock: true,
      executed_at: executedAt,
      response: verified ? `Verified execution of: "${intent}"` : null,
      evidence_hash: entry.hash,
      verification: execution.verification,
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
