import { createHash } from 'node:crypto';
import type { OmegaChangeRecord } from '@oceanicos/types';

export type TransitionExecutionStatus = 'EXECUTED' | 'REFUSED' | 'REVIEW_REQUIRED';

export interface TransitionExecution {
  readonly status: TransitionExecutionStatus;
  readonly record: OmegaChangeRecord;
  readonly attestationId?: string;
  readonly reason?: string;
}

export interface TransitionMemory {
  append(record: OmegaChangeRecord): void;
}

export interface TransitionExecutorOptions {
  readonly memory?: TransitionMemory;
  readonly now?: () => string;
}

export type TransitionHandler = (input: {
  readonly stateBefore: string;
  readonly context?: Record<string, unknown>;
}) => {
  readonly stateAfter: string;
  readonly consequence?: string;
};

/**
 * Execute only an already-authorized ALLOW record.
 *
 * Admission is not execution, execution is not proof of desired reality, and
 * this executor does not claim to verify external reality. The returned
 * attestation binds the recorded before/after transition and its consequence;
 * callers must independently observe and verify the real-world result.
 */
export function executeAuthorizedTransition(
  record: OmegaChangeRecord,
  handler: TransitionHandler,
  options: TransitionExecutorOptions = {},
): TransitionExecution {
  const now = options.now ?? (() => new Date().toISOString());
  const memory = options.memory;

  if (record.decision === 'DENY' || !record.authorized) {
    const refused: OmegaChangeRecord = {
      ...record,
      authorized: false,
      provenance: {
        ...record.provenance,
        lineage: [...(record.provenance.lineage ?? []), `${record.id}:refused`],
      },
      createdAt: now(),
    };
    memory?.append(refused);
    return { status: 'REFUSED', record: refused, reason: 'change is not authorized' };
  }

  if (record.decision !== 'ALLOW') {
    const review: OmegaChangeRecord = {
      ...record,
      authorized: false,
      provenance: {
        ...record.provenance,
        lineage: [...(record.provenance.lineage ?? []), `${record.id}:review`],
      },
      createdAt: now(),
    };
    memory?.append(review);
    return { status: 'REVIEW_REQUIRED', record: review, reason: 'change requires human or policy review' };
  }

  const result = handler({ stateBefore: record.stateBefore, context: record.context });
  if (!result.stateAfter.trim()) throw new Error('transition handler must return a non-empty stateAfter');

  const attestationPayload = JSON.stringify({
    changeId: record.id,
    subject: record.subject,
    intent: record.intent,
    stateBefore: record.stateBefore,
    stateAfter: result.stateAfter,
    consequence: result.consequence ?? null,
    executedAt: now(),
  });
  const digest = createHash('sha256').update(attestationPayload).digest('hex');
  const attestationId = `attestation-${digest}`;
  const executed: OmegaChangeRecord = {
    ...record,
    transition: `${record.stateBefore} -> ${result.stateAfter}`,
    stateAfter: result.stateAfter,
    consequence: result.consequence,
    attestationId,
    provenance: {
      ...record.provenance,
      source: 'mini-authorized-transition',
      attributedTo: record.authority,
      lineage: [...(record.provenance.lineage ?? []), attestationId],
    },
    createdAt: now(),
  };
  memory?.append(executed);
  return { status: 'EXECUTED', record: executed, attestationId };
}
