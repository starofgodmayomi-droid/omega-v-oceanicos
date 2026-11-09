/**
 * 🌊 ƆCEANiC_OS(v∞) :: Shared Whole-Ecosystem Verification Contract
 *
 * Implements the Single Execution Law:
 * Ω∞v(OCEANICOS) := RECONCILE(
 *   OBSERVE(REALITY),
 *   DISTINGUISH(KNOWN, INFERRED, UNKNOWN),
 *   AUTHORIZE(POLICY, CAPABILITY, HUMAN_CONSENT),
 *   BUILD(BOUNDED_CHANGE),
 *   TEST(CODE, CONTRACTS, INTEGRATION),
 *   ATTEST(EVIDENCE, PROVENANCE),
 *   REMEMBER(VERIFIED_CONTEXT),
 *   COMPARE(EXPECTED, OBSERVED),
 *   REPEAT_ONLY_WHILE_SAFE
 * )
 *
 * Fail-Closed Invariants:
 * - ¬Evidence ⇒ NO VERIFIED CLAIM
 * - ¬Authority ⇒ NO EXECUTION (Outcome: NOT_EXECUTED)
 * - Mismatch ⇒ DIVERGENT
 * - Missing observation ⇒ UNKNOWN
 * - No attempt ⇒ NOT_EXECUTED
 * - Verified change ⇒ Traceable next state (Outcome: VERIFIED)
 *
 * Outcome ∈ { VERIFIED, DIVERGENT, UNKNOWN, NOT_EXECUTED }
 *
 * The 4 × 4 Whole-Body Matrix:
 * M_Ω = [
 *   [S, I, E, A],  // Reality:      State, Intent, Evidence, Authority
 *   [P, C, D, R],  // Intelligence: Policy, Capability, Decision, Result
 *   [O, V, T, M],  // Execution:    Observe, Verify, Transition, Memory
 *   [K, L, G, Ω]   // Continuity:   KAI/LUCID, Living Stack, Connected Graph, Bounded Evolution
 * ]
 */

import { createHash } from 'node:crypto';

export const HUMAN_ROOT_ID = 'did:omega:human:starofgodmayomi' as const;
export const HUMAN_ROOT_NAME = 'ELION VAREL' as const;

export type VerificationContractOutcome =
  | 'VERIFIED'
  | 'DIVERGENT'
  | 'UNKNOWN'
  | 'NOT_EXECUTED';

export type ContractDecision = 'ALLOW' | 'DENY' | 'REVIEW';

export interface VerificationEvidenceInput {
  readonly claim: string;
  readonly observed: boolean;
  readonly verified: boolean;
  readonly confidence?: number;
  readonly proof?: string;
  readonly source?: string;
}

export interface VerificationObservationInput {
  readonly observed: boolean;
  readonly observedState?: Record<string, unknown> | string;
  readonly telemetryUuid?: string;
  readonly timestamp?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface VerificationContractInput {
  /** S: Current state before transition */
  readonly stateBefore: Record<string, unknown> | string;
  /** I: Bounded human / operational intent */
  readonly intent: string;
  /** Expected target state after transition */
  readonly expectedState?: Record<string, unknown> | string;

  /** A: Authority present and granted */
  readonly authority: boolean;
  /** Explicit human root consent for consequential actions */
  readonly humanConsent?: boolean;
  /** P: Policy evaluated and passed */
  readonly policyPassed: boolean;
  /** C: Operational capability verified */
  readonly capabilityPresent?: boolean;

  /** Did an authorized execution attempt take place? */
  readonly attempted: boolean;
  /** Did execution run to completion without unhandled crash? */
  readonly executed?: boolean;

  /** O: Observed reality / empirical telemetry */
  readonly observation?: VerificationObservationInput | null;
  /** E: Evidence bound to the claim */
  readonly evidence?: VerificationEvidenceInput | null;

  /** Optional dissent records / conflicting interpretations */
  readonly dissent?: readonly string[];
  /** Lineage: previous cryptographic proof hash for chaining */
  readonly previousProofHash?: string | null;
  /** Sequential transition step index */
  readonly stepIndex?: number;
}

export interface WholeBodyMatrix4x4 {
  // Row 0: REALITY
  readonly S: string;
  readonly I: string;
  readonly E: boolean;
  readonly A: boolean;
  // Row 1: INTELLIGENCE
  readonly P: boolean;
  readonly C: boolean;
  readonly D: ContractDecision;
  readonly R: string;
  // Row 2: EXECUTION (O, V, T, M)
  readonly O: boolean;
  readonly V: boolean;
  readonly T: string;
  readonly M: string;
  // Row 3: CONTINUITY (K, L, G, Ω)
  readonly K: string;
  readonly L: string;
  readonly G: string;
  readonly omega: string;
}

export interface InvariantEvaluationReport {
  readonly noEvidenceNoClaim: boolean;
  readonly noAuthorityNoExecution: boolean;
  readonly mismatchDivergent: boolean;
  readonly missingObservationUnknown: boolean;
  readonly noAttemptNotExecuted: boolean;
  readonly verifiedChangeTraceable: boolean;
  readonly failClosedEnforced: boolean;
}

export interface VerificationContractReceipt {
  readonly '🌊': 'ƆCEANiC_OS(v∞)';
  readonly contract: 'Ω∞v-SHARED-VERIFICATION-CONTRACT-V1';
  readonly humanRoot: typeof HUMAN_ROOT_ID;
  readonly humanSteward: typeof HUMAN_ROOT_NAME;
  readonly outcome: VerificationContractOutcome;
  readonly decision: ContractDecision;
  readonly reason: string;
  readonly stateBefore: Record<string, unknown> | string;
  readonly stateAfter: Record<string, unknown> | string;
  readonly matrix: WholeBodyMatrix4x4;
  readonly numericalMatrix: readonly (readonly number[])[];
  readonly frobeniusNorm: number;
  readonly fourthRootGramDeterminant: number;
  readonly invariants: InvariantEvaluationReport;
  readonly dissent: readonly string[];
  readonly proofChain: {
    readonly previousHash: string | null;
    readonly currentHash: string;
  };
  readonly evaluatedAt: string;
}

/** 3x3 Determinant via standard cofactor expansion */
function det3x3(m: number[][]): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

/** 4x4 Determinant via Laplace expansion along the first row */
function det4x4(m: number[][]): number {
  let det = 0;
  for (let j = 0; j < 4; j++) {
    const sub3: number[][] = [];
    for (let r = 1; r < 4; r++) {
      const row: number[] = [];
      for (let c = 0; c < 4; c++) {
        if (c !== j) row.push(m[r][c]);
      }
      sub3.push(row);
    }
    const sign = j % 2 === 0 ? 1 : -1;
    det += sign * m[0][j] * det3x3(sub3);
  }
  return det;
}

/** Deep state comparison helper */
function statesMatch(
  expected?: Record<string, unknown> | string,
  observed?: Record<string, unknown> | string
): boolean {
  if (expected === undefined || observed === undefined) return false;
  if (typeof expected === 'string' && typeof observed === 'string') {
    return expected.trim() === observed.trim();
  }
  try {
    return JSON.stringify(expected) === JSON.stringify(observed);
  } catch {
    return false;
  }
}

/**
 * Evaluates the shared verification contract across all four outcomes
 * strictly governed by the Single Execution Law & Fail-Closed Invariants:
 *
 * 1. ¬Authority ⇒ NO EXECUTION (Outcome: NOT_EXECUTED, Decision: DENY)
 * 2. No attempt ⇒ NOT_EXECUTED (Outcome: NOT_EXECUTED)
 * 3. Missing observation ⇒ UNKNOWN (Outcome: UNKNOWN, Decision: REVIEW)
 * 4. Mismatch ⇒ DIVERGENT (Outcome: DIVERGENT, Decision: REVIEW)
 * 5. ¬Evidence ⇒ NO VERIFIED CLAIM (Outcome: UNKNOWN or DIVERGENT)
 * 6. Verified change ⇒ Traceable next state (Outcome: VERIFIED, Decision: ALLOW)
 */
export function evaluateVerificationContract(
  input: VerificationContractInput
): VerificationContractReceipt {
  const evaluatedAt = new Date().toISOString();

  const authority = input.authority === true;
  const humanConsent = input.humanConsent !== false;
  const policyPassed = input.policyPassed === true;
  const capabilityPresent = input.capabilityPresent !== false;
  const attempted = input.attempted === true;
  const executed = input.executed !== false;

  const obs = input.observation;
  const hasObservation = Boolean(obs && obs.observed === true && obs.observedState !== undefined);

  const ev = input.evidence;
  const hasVerifiedEvidence = Boolean(ev && ev.observed === true && ev.verified === true);

  const dissentList: string[] = input.dissent ? [...input.dissent] : [];

  let outcome: VerificationContractOutcome;
  let decision: ContractDecision;
  let reason: string;
  let stateAfter: Record<string, unknown> | string;

  // ── INVARIANT GATES EVALUATION ──

  // Gate 1: Fail-closed Authority check (¬Authority ⇒ NO EXECUTION)
  if (!authority || !policyPassed || !humanConsent) {
    outcome = 'NOT_EXECUTED';
    decision = 'DENY';
    reason = !authority
      ? 'NO_AUTHORITY: Execution forbidden without verified human root authorization.'
      : !policyPassed
      ? 'POLICY_REJECTED: Execution blocked by policy gate.'
      : 'NO_HUMAN_CONSENT: Consequential execution withheld without explicit human consent.';
    stateAfter = input.stateBefore;
  }
  // Gate 2: No attempt check (No attempt ⇒ NOT_EXECUTED)
  else if (!attempted || !executed) {
    outcome = 'NOT_EXECUTED';
    decision = 'DENY';
    reason = !attempted
      ? 'NO_ATTEMPT: Transition was authorized but never attempted.'
      : 'EXECUTION_INCOMPLETE: Transition halted before execution completed.';
    stateAfter = input.stateBefore;
  }
  // Gate 3: Missing observation check (Missing observation ⇒ UNKNOWN)
  else if (!hasObservation) {
    outcome = 'UNKNOWN';
    decision = 'REVIEW';
    reason = 'MISSING_OBSERVATION: Execution attempted but reality was not observed.';
    stateAfter = input.stateBefore;
  }
  // Gate 4: Mismatch check (Mismatch ⇒ DIVERGENT)
  else if (
    input.expectedState !== undefined &&
    !statesMatch(input.expectedState, obs?.observedState)
  ) {
    outcome = 'DIVERGENT';
    decision = 'REVIEW';
    reason = 'MISMATCH: Observed state diverged from expected target state.';
    dissentList.push(
      `Divergence: expected ${JSON.stringify(input.expectedState)} but observed ${JSON.stringify(
        obs?.observedState
      )}`
    );
    stateAfter = obs?.observedState ?? input.stateBefore;
  }
  // Gate 5: Evidence check (¬Evidence ⇒ NO VERIFIED CLAIM)
  else if (!hasVerifiedEvidence) {
    outcome = 'UNKNOWN';
    decision = 'REVIEW';
    reason = 'NO_EVIDENCE: Observation matched expectation but verified cryptographic evidence is missing.';
    stateAfter = obs?.observedState ?? input.stateBefore;
  }
  // Gate 6: Verified Change (Verified change ⇒ Traceable next state)
  else {
    outcome = 'VERIFIED';
    decision = 'ALLOW';
    reason = 'VERIFIED: Authorized, executed, observed, matched expectation, and attested with verified evidence.';
    stateAfter = obs?.observedState ?? input.expectedState ?? input.stateBefore;
  }

  // ── 4 × 4 WHOLE-BODY MATRIX FORMULATION ──
  // Row 0: REALITY      [S, I, E, A]
  // Row 1: INTELLIGENCE [P, C, D, R]
  // Row 2: EXECUTION    [O, V, T, M] (Observe, Verify, Transition, Memory)
  // Row 3: CONTINUITY   [K, L, G, Ω] (KAI/LUCID, Living Stack, Connected Graph, Bounded Evolution)
  const matrix: WholeBodyMatrix4x4 = {
    S: typeof input.stateBefore === 'string' ? input.stateBefore : 'STATE_DEFINED',
    I: input.intent,
    E: hasVerifiedEvidence,
    A: authority,

    P: policyPassed,
    C: capabilityPresent,
    D: decision,
    R: outcome === 'VERIFIED' ? 'RESULT_TRANSITION_VERIFIED' : `RESULT_${outcome}`,

    O: hasObservation,
    V: outcome === 'VERIFIED',
    T: outcome === 'VERIFIED' ? 'FINITE_TRANSITION_ADVANCED' : 'TRANSITION_HALTED',
    M: 'APPEND_ONLY_MERKLE_PROVENANCE_CHAIN',

    K: 'KAI_LUCID_EPISTEMIC_NAVIGATOR',
    L: 'ONE_LIVING_VERIFIED_STACK',
    G: 'ECOSYSTEM_GRAPH_GROUNDED',
    omega: 'BOUNDED_FINITE_ITERATION_Ω',
  };

  // Construct normalized numerical matrix M (4x4)
  const numericalMatrix: number[][] = [
    [
      matrix.S ? 1.0 : 0.0,
      matrix.I ? 1.0 : 0.0,
      matrix.E ? 1.0 : 0.0,
      matrix.A ? 1.0 : 0.0,
    ],
    [
      matrix.P ? 1.0 : 0.0,
      matrix.C ? 1.0 : 0.0,
      matrix.D === 'ALLOW' ? 1.0 : matrix.D === 'REVIEW' ? 0.5 : 0.0,
      matrix.R.includes('VERIFIED') ? 1.0 : 0.0,
    ],
    [
      matrix.O ? 1.0 : 0.0,
      matrix.V ? 1.0 : 0.0,
      matrix.T.includes('ADVANCED') ? 1.0 : 0.0,
      matrix.M ? 1.0 : 0.0,
    ],
    [
      matrix.K ? 1.0 : 0.0,
      matrix.L ? 1.0 : 0.0,
      matrix.G ? 1.0 : 0.0,
      matrix.omega ? 1.0 : 0.0,
    ],
  ];

  // Fail-closed collapse: if unauthorized, zero execution & intelligence rows
  if (decision === 'DENY') {
    numericalMatrix[1] = [0.0, 0.0, 0.0, 0.0];
    numericalMatrix[2] = [0.0, 0.0, 0.0, 0.0];
  }

  // Compute Frobenius norm
  let sumSq = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      sumSq += numericalMatrix[r][c] * numericalMatrix[r][c];
    }
  }
  const frobeniusNorm = Number(Math.sqrt(sumSq).toFixed(6));

  // Compute Gram matrix G = I_4 + M^T M and fourth-root determinant: ⁴√det(I₄ + MᵀM)
  const gram: number[][] = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += numericalMatrix[k][i] * numericalMatrix[k][j];
      }
      gram[i][j] += sum;
    }
  }
  const gramDeterminant = Math.max(0, det4x4(gram));
  const fourthRootGramDeterminant = Number(Math.pow(gramDeterminant, 0.25).toFixed(6));

  // Invariant verification report
  const invariants: InvariantEvaluationReport = {
    noEvidenceNoClaim: !hasVerifiedEvidence ? outcome !== 'VERIFIED' : true,
    noAuthorityNoExecution: !authority ? outcome === 'NOT_EXECUTED' && decision === 'DENY' : true,
    mismatchDivergent:
      input.expectedState !== undefined && !statesMatch(input.expectedState, obs?.observedState)
        ? outcome === 'DIVERGENT'
        : true,
    missingObservationUnknown: !hasObservation && attempted && authority ? outcome === 'UNKNOWN' : true,
    noAttemptNotExecuted: !attempted ? outcome === 'NOT_EXECUTED' : true,
    verifiedChangeTraceable: outcome === 'VERIFIED' ? Boolean(stateAfter) : true,
    failClosedEnforced: decision === 'DENY' ? numericalMatrix[1].every((v) => v === 0) : true,
  };

  // Cryptographic proof chaining
  const previousHash = input.previousProofHash ?? null;
  const proofPayload = JSON.stringify({
    previousHash,
    outcome,
    decision,
    reason,
    frobeniusNorm,
    fourthRootGramDeterminant,
    stateBefore: input.stateBefore,
    stateAfter,
    evaluatedAt,
  });
  const currentHash = createHash('sha256').update(proofPayload).digest('hex');

  return {
    '🌊': 'ƆCEANiC_OS(v∞)',
    contract: 'Ω∞v-SHARED-VERIFICATION-CONTRACT-V1',
    humanRoot: HUMAN_ROOT_ID,
    humanSteward: HUMAN_ROOT_NAME,
    outcome,
    decision,
    reason,
    stateBefore: input.stateBefore,
    stateAfter,
    matrix,
    numericalMatrix,
    frobeniusNorm,
    fourthRootGramDeterminant,
    invariants,
    dissent: dissentList,
    proofChain: {
      previousHash,
      currentHash,
    },
    evaluatedAt,
  };
}

export default evaluateVerificationContract;
