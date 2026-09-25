import { createHash } from 'node:crypto';

/**
 * Ω∞v Reconciliation Engine (C6)
 *
 * Compares an expected state against an observed/actual state and produces an
 * evidence-bound verdict. This is the "expected ↔ actual" boundary from the
 * OCEANICOS reality loop.
 *
 * Constitutional invariants:
 *   - UNKNOWN is a valid state; absence of observation is never upgraded.
 *   - A page, prompt, agent, or model saying "done" never promotes status.
 *   - VERIFIED requires: execution occurred + observation succeeded + expected ≈ actual.
 *   - DIVERGENT requires: execution occurred + observation succeeded + expected ≠ actual.
 *   - NOT_EXECUTED: no executed transition was available.
 *   - UNKNOWN: observation was attempted but could not be obtained.
 */

export type ReconciliationStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface ReconciliationInput {
  /** Change id being reconciled. */
  readonly changeId: string;
  /** State the executor recorded as the expected result. */
  readonly expectedState: string;
  /**
   * Observed actual state. `undefined` means the transition was not executed;
   * an observation function that throws yields UNKNOWN.
   */
  readonly observedState?: string;
  /** Optional execution attestation id for provenance linkage. */
  readonly attestationId?: string;
  /** Provenance lineage from the change record. */
  readonly provenanceLineage?: readonly string[];
  /** Override timestamp (deterministic tests). */
  readonly now?: () => string;
}

export interface ReconciliationResult {
  readonly status: ReconciliationStatus;
  readonly changeId: string;
  readonly expectedState: string;
  readonly observedState?: string;
  /** SHA-256 evidence digest binding expected + observed + lineage. */
  readonly evidence: string;
  readonly reconciledAt: string;
  /** Human-readable divergence description when status is DIVERGENT. */
  readonly divergence?: string;
}

const sha256 = (payload: string): string => createHash('sha256').update(payload).digest('hex');

/**
 * Reconcile a single expected/actual pair.
 *
 * @param input.expectedState  The state the executor claims it produced.
 * @param input.observedState   The independently observed actual state.
 *                              Omit it (or pass undefined) when no execution
 *                              occurred. Pass an observation function via
 *                              `reconcileWithObserver` when observation may fail.
 */
export function reconcile(input: ReconciliationInput): ReconciliationResult {
  const now = input.now ?? (() => new Date().toISOString());
  const reconciledAt = now();

  // NOT_EXECUTED: no observed state was supplied.
  if (input.observedState === undefined) {
    return {
      status: 'NOT_EXECUTED',
      changeId: input.changeId,
      expectedState: input.expectedState,
      evidence: `sha256:${sha256(JSON.stringify({
        changeId: input.changeId,
        expectedState: input.expectedState,
        observedState: null,
        attestationId: input.attestationId ?? null,
        reconciledAt,
      }))}`,
      reconciledAt,
    };
  }

  const matches = input.observedState === input.expectedState;
  const evidence = `sha256:${sha256(JSON.stringify({
    changeId: input.changeId,
    attestationId: input.attestationId ?? null,
    expectedState: input.expectedState,
    observedState: input.observedState,
    provenanceLineage: input.provenanceLineage ?? [],
    reconciledAt,
  }))}`;

  return {
    status: matches ? 'VERIFIED' : 'DIVERGENT',
    changeId: input.changeId,
    expectedState: input.expectedState,
    observedState: input.observedState,
    evidence,
    reconciledAt,
    divergence: matches ? undefined : `expected "${input.expectedState}" but observed "${input.observedState}"`,
  };
}

/**
 * Reconcile using an observation function that may fail.
 *
 * If the observer throws, the result is UNKNOWN — the reality could not be
 * verified, which is never silently upgraded to VERIFIED.
 */
export function reconcileWithObserver(
  input: Omit<ReconciliationInput, 'observedState'> & {
    readonly observeState: () => string;
  },
): ReconciliationResult {
  let observedState: string;
  try {
    observedState = input.observeState();
  } catch {
    const now = input.now ?? (() => new Date().toISOString());
    return {
      status: 'UNKNOWN',
      changeId: input.changeId,
      expectedState: input.expectedState,
      evidence: `sha256:${sha256(JSON.stringify({
        changeId: input.changeId,
        expectedState: input.expectedState,
        attestationId: input.attestationId ?? null,
        observationError: true,
        reconciledAt: now(),
      }))}`,
      reconciledAt: now(),
    };
  }

  return reconcile({ ...input, observedState });
}

/**
 * Reconcile multiple expected/actual pairs in batch.
 */
export function reconcileAll(inputs: readonly ReconciliationInput[]): readonly ReconciliationResult[] {
  return inputs.map((input) => reconcile(input));
}

/**
 * Aggregate summary of a batch of reconciliation results.
 */
export interface ReconciliationSummary {
  readonly total: number;
  readonly verified: number;
  readonly divergent: number;
  readonly unknown: number;
  readonly notExecuted: number;
  readonly allVerified: boolean;
}

export function summarizeReconciliation(results: readonly ReconciliationResult[]): ReconciliationSummary {
  const counts = { VERIFIED: 0, DIVERGENT: 0, UNKNOWN: 0, NOT_EXECUTED: 0 };
  for (const result of results) {
    counts[result.status]++;
  }
  return {
    total: results.length,
    verified: counts.VERIFIED,
    divergent: counts.DIVERGENT,
    unknown: counts.UNKNOWN,
    notExecuted: counts.NOT_EXECUTED,
    allVerified: results.length > 0 && counts.VERIFIED === results.length,
  };
}
