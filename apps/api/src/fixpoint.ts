/**
 * The Absolute Fixpoint Equation — declared once, reported by every contract.
 *
 * The law is stated in ECOSYSTEM_BODY.md:
 *
 *   Ω∞v := Y( λf. ( M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤ ) ) | V ≡ (Expected ≡ Observed)
 *
 * Y keeps a memory step only after reality has verified it, and the step form
 * decides at every tick whether to continue or to halt (VERIFIED | DIVERGENT |
 * UNKNOWN | NOT_EXECUTED). Reporting the law is not a proof of it: `observed`
 * carries a runtime status only where the caller actually observed one.
 */
export const FIXPOINT_LAW =
  'Ω∞v := Y( λf. ( M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤ ) ) | V ≡ (Expected ≡ Observed)';
export const FIXPOINT_STEP = 'λx. f(Σ ∪ Hash(x)) when O(E(x)) ≡ VERIFIED, else HALT';
export const FIXPOINT_TRUTH = 'Expected ≡ Observed';
export const FIXPOINT_SOURCE = 'ECOSYSTEM_BODY.md';
export const FIXPOINT_BOUNDARY =
  'the law is declared; this reading reports the observed status of this runtime, not a proof of infinity';

export interface FixpointBranch {
  when: string;
  then: string;
}

export interface FixpointReport {
  law: string;
  step: string;
  truth: string;
  branches: FixpointBranch[];
  /** Present only where the caller observed a status for this read. */
  observed?: string;
  source: string;
  scope: 'local-runtime';
  boundary: string;
}

export const FIXPOINT_BRANCHES: FixpointBranch[] = [
  { when: 'O(E(x)) ≡ VERIFIED', then: 'f(Σ ∪ Hash(x))' },
  { when: 'K(x) ∈ SCAM', then: 'HALT ⊢ DIVERGENT' },
  { when: 'Evidence(x) = ∅', then: 'HALT ⊢ UNKNOWN' },
  { when: 'Authority(x) < Required', then: 'HALT ⊢ NOT_EXECUTED' },
];

export function fixpointReport(observed?: string): FixpointReport {
  return {
    law: FIXPOINT_LAW,
    step: FIXPOINT_STEP,
    truth: FIXPOINT_TRUTH,
    branches: FIXPOINT_BRANCHES,
    ...(observed ? { observed } : {}),
    source: FIXPOINT_SOURCE,
    scope: 'local-runtime',
    boundary: FIXPOINT_BOUNDARY,
  };
}
