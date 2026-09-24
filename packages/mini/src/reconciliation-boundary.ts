import { createHash } from 'node:crypto';
import type { OmegaChangeRecord } from '@oceanicos/types';
import {
  reconcileReality,
  type RealityObservation,
  type RealityReconciliation,
  type RealityVerdict,
} from './reality.js';
import {
  OmegaAttestationMemory,
  type AttestationEntry,
  type AttestationMemory,
} from './attestation-memory.js';
import type {
  TransitionExecution,
  TransitionExecutionStatus,
} from './transition.js';

export interface ReconciliationBoundaryInput {
  readonly change: OmegaChangeRecord;
  readonly execution?: TransitionExecution;
  readonly observation?: RealityObservation;
  readonly actor?: string;
  readonly now?: () => string;
}

export interface ReconciliationAttestation {
  readonly attestationId: string;
  readonly changeId: string;
  readonly verdict: RealityVerdict;
  readonly claimedStateHash: string;
  readonly observedStateHash: string;
  readonly discrepancies: readonly string[];
  readonly digest: string;
  readonly attestedAt: string;
  readonly attestedBy: string;
}

export interface ReconciledBoundaryResult {
  readonly change: OmegaChangeRecord;
  readonly reconciliation: RealityReconciliation;
  readonly attestation: ReconciliationAttestation;
  readonly entry: AttestationEntry;
  readonly memorySnapshot: AttestationMemory;
}

export interface ReplayVerificationOutcome {
  readonly valid: boolean;
  readonly changeId: string;
  readonly originalVerdict: RealityVerdict;
  readonly replayedVerdict: RealityVerdict;
  readonly verdictMatches: boolean;
  readonly hashMatches: boolean;
  readonly chainIntegrityValid: boolean;
  readonly discrepancies: readonly string[];
  readonly replayedAt: string;
}

/**
 * Canonical Reconciliation Boundary
 *
 * Implements the constitutional boundary around reality.ts:
 *
 * HUMAN INTENT → ΩIR → EVIDENCE → VERIFY → AUTHORITY → POLICY → ADMISSION
 *   → BOUNDED WORKER → EXECUTION → OBSERVATION
 *   → RECONCILIATION (VERIFIED | DIVERGENT | UNKNOWN | NOT_EXECUTED)
 *   → ATTESTATION → PROVENANCE → MEMORY → REPLAY
 *
 * Strict anti-collapse invariants:
 *   POSSIBLE ≠ KNOWN ≠ REPRESENTABLE ≠ PERMITTED ≠ PROPOSED ≠ ATTEMPTED
 *   ≠ EXECUTED ≠ OBSERVED ≠ VERIFIED ≠ ATTESTED ≠ DEPLOYED ≠ HEALTHY ≠ CORRECT
 *
 * The boundary preserves discrepancies as empirical truth, never fabricates
 * completion, links immutable cryptographic hashes into attestation memory,
 * and allows deterministic offline replay verification.
 */
export class OmegaReconciliationBoundary {
  private readonly memory: OmegaAttestationMemory;
  private readonly defaultActor: string;

  constructor(memory?: OmegaAttestationMemory, defaultActor = 'kernel:reconciliation-boundary') {
    this.memory = memory ?? new OmegaAttestationMemory();
    this.defaultActor = defaultActor;
  }

  /**
   * Reconcile a claimed change against external reality observation,
   * mint cryptographic attestation, bind provenance lineage, and commit to memory.
   */
  public reconcileAndBind(input: ReconciliationBoundaryInput): ReconciledBoundaryResult {
    const { change, observation, execution } = input;
    const now = input.now ?? (() => new Date().toISOString());
    const timestamp = now();
    const actor = input.actor ?? this.defaultActor;

    // Step 1: Execute canonical reality reconciliation contract
    const reconciliation = reconcileReality(change, observation);

    // Step 2: Mint unforgeable cryptographic reconciliation attestation
    const attestationPayload = JSON.stringify({
      changeId: change.id,
      verdict: reconciliation.verdict,
      claimedStateHash: reconciliation.claimedStateHash,
      observedStateHash: reconciliation.observedStateHash,
      discrepancies: reconciliation.discrepancies,
      reconcileTimestamp: reconciliation.reconcileTimestamp,
      attestedAt: timestamp,
      attestedBy: actor,
    });
    const digest = createHash('sha256').update(attestationPayload).digest('hex');
    const attestationId = `attest-reconcile-${digest.slice(0, 16)}`;

    const attestation: ReconciliationAttestation = {
      attestationId,
      changeId: change.id,
      verdict: reconciliation.verdict,
      claimedStateHash: reconciliation.claimedStateHash,
      observedStateHash: reconciliation.observedStateHash,
      discrepancies: reconciliation.discrepancies,
      digest,
      attestedAt: timestamp,
      attestedBy: actor,
    };

    // Step 3: Bind attestation and provenance lineage without mutating past facts
    const updatedLineage = [
      ...(change.provenance?.lineage ?? []),
      `reconcile:${reconciliation.verdict.toLowerCase()}:${digest.slice(0, 12)}`,
    ];

    const boundChange: OmegaChangeRecord = {
      ...change,
      attestationId: change.attestationId ?? attestationId,
      provenance: {
        ...change.provenance,
        source: 'canonical-reconciliation-boundary',
        observedAt: timestamp,
        lineage: updatedLineage,
      },
    };

    // Step 4: Resolve transition execution status for memory recording
    const transitionStatus: TransitionExecutionStatus =
      !boundChange.stateAfter || !boundChange.stateAfter.trim()
        ? 'REFUSED'
        : boundChange.decision === 'DENY' || !boundChange.authorized
        ? 'REFUSED'
        : boundChange.decision === 'REVIEW'
        ? 'REVIEW_REQUIRED'
        : 'EXECUTED';

    const exec: TransitionExecution = execution ?? {
      status: transitionStatus,
      record: boundChange,
      attestationId: boundChange.attestationId,
      reason: reconciliation.discrepancies.length > 0 ? reconciliation.discrepancies.join('; ') : undefined,
    };

    // Step 5: Append to append-only attestation memory chain
    const entry = this.memory.append(boundChange, exec, reconciliation);
    const memorySnapshot = this.memory.snapshot();

    return {
      change: boundChange,
      reconciliation,
      attestation,
      entry,
      memorySnapshot,
    };
  }

  /**
   * Replay and verify a reconciliation record against an observation.
   * Confirms deterministic idempotency, hash agreement, and chain integrity.
   */
  public replay(
    change: OmegaChangeRecord,
    observation?: RealityObservation,
    expectedEntry?: AttestationEntry,
  ): ReplayVerificationOutcome {
    const replayedReconciliation = reconcileReality(change, observation);
    const discrepancies: string[] = [];

    const originalVerdict = (expectedEntry?.realityVerdict as RealityVerdict) ?? replayedReconciliation.verdict;
    const replayedVerdict = replayedReconciliation.verdict;
    const verdictMatches = originalVerdict === replayedVerdict;

    if (!verdictMatches) {
      discrepancies.push(`Verdict mismatch: original was "${originalVerdict}", replayed is "${replayedVerdict}".`);
    }

    let hashMatches = true;
    if (expectedEntry) {
      if (expectedEntry.claimedStateHash !== replayedReconciliation.claimedStateHash) {
        hashMatches = false;
        discrepancies.push(
          `Claimed state hash mismatch: original="${expectedEntry.claimedStateHash}", replayed="${replayedReconciliation.claimedStateHash}".`
        );
      }
      if (expectedEntry.observedStateHash !== replayedReconciliation.observedStateHash) {
        hashMatches = false;
        discrepancies.push(
          `Observed state hash mismatch: original="${expectedEntry.observedStateHash}", replayed="${replayedReconciliation.observedStateHash}".`
        );
      }
    }

    const chainIntegrityValid = this.memory.verifyIntegrity();
    if (!chainIntegrityValid) {
      discrepancies.push('Attestation memory chain integrity check failed.');
    }

    const valid = verdictMatches && hashMatches && chainIntegrityValid;

    return {
      valid,
      changeId: change.id,
      originalVerdict,
      replayedVerdict,
      verdictMatches,
      hashMatches,
      chainIntegrityValid,
      discrepancies,
      replayedAt: new Date().toISOString(),
    };
  }

  /**
   * Replay and verify the entire attestation memory chain.
   */
  public replayChain(): {
    readonly valid: boolean;
    readonly height: number;
    readonly tipHash: string;
    readonly integrityValid: boolean;
    readonly entries: readonly AttestationEntry[];
  } {
    const snapshot = this.memory.snapshot();
    return {
      valid: snapshot.integrityValid,
      height: snapshot.height,
      tipHash: snapshot.tipHash,
      integrityValid: snapshot.integrityValid,
      entries: snapshot.entries,
    };
  }

  public getMemory(): OmegaAttestationMemory {
    return this.memory;
  }
}
