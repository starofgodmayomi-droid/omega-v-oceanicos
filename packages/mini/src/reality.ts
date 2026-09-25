import { createHash } from 'node:crypto';
import type { OmegaChangeRecord } from '@oceanicos/types';
import type { TransitionExecution, TransitionMemory } from './transition.js';

export type RealityVerdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
export type RealityVerificationStatus = RealityVerdict;

export interface RealityObservation {
  readonly observerId: string;
  readonly target: string;
  readonly observedState: string;
  readonly stateHash: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
}

export interface RealityReconciliation {
  readonly verdict: RealityVerdict;
  readonly claimedStateHash: string;
  readonly observedStateHash: string;
  readonly discrepancies: readonly string[];
  readonly reconcileTimestamp: string;
  readonly changeId: string;
}

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
 * Hash a deterministic state string for comparison.
 * Pure function — no I/O, no side effects.
 */
function hashState(state: string): string {
  return createHash('sha256').update(state).digest('hex');
}

/**
 * Create a deterministic reality observation from an external snapshot.
 *
 * This function does not perform any I/O itself; the caller must supply
 * the observed state as a string. The observation is hashed for tamper
 * detection, not for authority.
 */
export function createRealityObservation(
  observerId: string,
  target: string,
  observedState: string,
  metadata?: Record<string, unknown>,
): RealityObservation {
  if (!observerId.trim()) throw new Error('observerId is required');
  if (!target.trim()) throw new Error('target is required');
  if (!observedState.trim()) throw new Error('observedState is required');

  return {
    observerId: observerId.trim(),
    target: target.trim(),
    observedState: observedState.trim(),
    stateHash: hashState(observedState.trim()),
    timestamp: new Date().toISOString(),
    metadata,
  };
}

/**
 * Reconcile a claimed transition against an external reality observation.
 *
 * Rules (fail-closed):
 * 1. If the change was never executed (no stateAfter), verdict is NOT_EXECUTED.
 * 2. If no observation is supplied, verdict is UNKNOWN.
 * 3. If the claimed stateAfter hash matches the observed state hash, VERIFIED.
 * 4. Otherwise, DIVERGENT with enumerated discrepancies.
 *
 * This reconciler does not grant authority, retry execution, or modify state.
 */
export function reconcileReality(
  change: OmegaChangeRecord,
  observation?: RealityObservation,
): RealityReconciliation {
  const reconcileTimestamp = new Date().toISOString();
  const changeId = change.id;

  // Gate 1: execution must have occurred
  if (!change.stateAfter || !change.stateAfter.trim()) {
    return {
      verdict: 'NOT_EXECUTED',
      claimedStateHash: '',
      observedStateHash: '',
      discrepancies: ['Change has no recorded stateAfter — execution not proven.'],
      reconcileTimestamp,
      changeId,
    };
  }

  // Gate 2: observation must exist
  if (!observation) {
    return {
      verdict: 'UNKNOWN',
      claimedStateHash: hashState(change.stateAfter),
      observedStateHash: '',
      discrepancies: ['No external reality observation supplied.'],
      reconcileTimestamp,
      changeId,
    };
  }

  const claimedHash = hashState(change.stateAfter);
  const observedHash = observation.stateHash;
  const discrepancies: string[] = [];

  // Compare hashes
  if (claimedHash !== observedHash) {
    discrepancies.push(
      `State hash mismatch: claimed=${claimedHash.slice(0, 16)}… observed=${observedHash.slice(0, 16)}…`,
    );
  }

  // Compare targets if transition specifies one
  if (change.transition) {
    const expectedTarget = change.transition.split('->').pop()?.trim();
    if (expectedTarget && expectedTarget !== observation.target) {
      discrepancies.push(
        `Target mismatch: transition claims "${expectedTarget}" but observation targets "${observation.target}".`,
      );
    }
  }

  const verdict: RealityVerdict = discrepancies.length === 0 ? 'VERIFIED' : 'DIVERGENT';

  return {
    verdict,
    claimedStateHash: claimedHash,
    observedStateHash: observedHash,
    discrepancies,
    reconcileTimestamp,
    changeId,
  };
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

  let observedState: string;
  try {
    observedState = observeState();
  } catch {
    const observedAt = now();
    const recordWithUnknownReality: OmegaChangeRecord = {
      ...record,
      consequence: `${record.consequence ?? 'transition executed'}; reality unknown: observation failed`,
      provenance: {
        ...record.provenance,
        source: 'mini-reality-observation',
        lineage: [...(record.provenance.lineage ?? []), `${record.id}:reality-unknown`],
      },
      createdAt: observedAt,
    };
    options.memory?.append(recordWithUnknownReality);
    return {
      status: 'UNKNOWN',
      expectedState: record.stateAfter,
      evidence: 'observation unavailable; reality could not be verified',
      record: recordWithUnknownReality,
    };
  }

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
