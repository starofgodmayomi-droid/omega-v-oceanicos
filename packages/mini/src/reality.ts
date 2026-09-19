import { createHash } from 'node:crypto';
import type { OmegaChangeRecord } from '@oceanicos/types';
import type { TransitionExecution, TransitionMemory } from './transition.js';

export type RealityVerificationStatus = 'VERIFIED' | 'DIVERGENT' | 'NOT_EXECUTED';

export interface RealityVerification {
  readonly status: RealityVerificationStatus;
  readonly observedState?: string;
  readonly expectedState?: string;
  readonly evidence: string;
  readonly record: OmegaChangeRecord;
}

export interface RealityObserverOptions {
  readonly memory?: TransitionMemory;
  readonly now?: () => string;
}

/**
 * Observe the external result of an execution and compare it with the state
 * recorded by the executor. This does not mutate reality and does not infer
 * causality beyond the supplied observation function.
 */
export function verifyExecutedReality(
  execution: TransitionExecution,
  observeState: () => string,
  options: RealityObserverOptions = {},
): RealityVerification {
  const now = options.now ?? (() => new Date().toISOString());
  const record = execution.record;
  if (execution.status !== 'EXECUTED' || !record.stateAfter) {
    const recordWithObservation: OmegaChangeRecord = {
      ...record,
      provenance: {
        ...record.provenance,
        lineage: [...(record.provenance.lineage ?? []), `${record.id}:not-executed`],
      },
      createdAt: now(),
    };
    options.memory?.append(recordWithObservation);
    return {
      status: 'NOT_EXECUTED',
      evidence: 'no executed transition was available for reality verification',
      record: recordWithObservation,
    };
  }

  const observedState = observeState();
  const matches = observedState === record.stateAfter;
  const observedAt = now();
  const evidence = createHash('sha256')
    .update(
      JSON.stringify({
        changeId: record.id,
        attestationId: record.attestationId ?? null,
        expectedState: record.stateAfter,
        observedState,
        observedAt,
        priorLineageRoot: createHash('sha256')
          .update(JSON.stringify(record.provenance.lineage ?? []))
          .digest('hex'),
      }),
    )
    .digest('hex');
  const verifiedRecord: OmegaChangeRecord = {
    ...record,
    consequence: `${record.consequence ?? 'transition executed'}; reality ${matches ? 'verified' : 'divergent'}`,
    provenance: {
      ...record.provenance,
      source: 'mini-reality-observation',
      lineage: [...(record.provenance.lineage ?? []), `observation-${evidence}`],
    },
    createdAt: observedAt,
  };
  options.memory?.append(verifiedRecord);
  return {
    status: matches ? 'VERIFIED' : 'DIVERGENT',
    observedState,
    expectedState: record.stateAfter,
    evidence: `sha256:${evidence}`,
    record: verifiedRecord,
  };
}
