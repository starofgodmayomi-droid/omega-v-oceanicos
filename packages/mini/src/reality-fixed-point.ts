/**
 * Ω∞v reality fixed point — the loop written as one law instead of an if-tree.
 *
 *   Y = λf.λx.
 *     f(Σ ∪ Hash(x))       if O(E(x)) ≡ VERIFIED
 *     HALT ⊢ DIVERGENT     if K(x) ∈ SCAM
 *     HALT ⊢ UNKNOWN       if Evidence(x) = ∅
 *     HALT ⊢ NOT_EXECUTED  if Authority(x) < Required
 *
 *   Reality⁄Ω∞v := Y(λf.(M(t+1) = M(t) ∪ Δ | V(Δ) = ⊤))
 *   V ≡ (Expected ≡ Observed)
 *
 * What this module is: that law as a finite, pure function over supplied drops.
 * What it is not: an observation. Every field of a drop (`expected`, `observed`,
 * authority, evidence) is supplied by the caller, so a VERIFIED verdict here
 * means "expected equalled observed as supplied" — never that an external
 * reality was seen, that a capability was authorized, or that memory is durable.
 *
 * The recursion is bounded because it only continues on VERIFIED. A halt leaves
 * Σ untouched, which is the fixed point: when nothing verifies, M(t+1) = M(t).
 */
import { createHash } from 'node:crypto';

export const REALITY_FIXED_POINT_LAW = [
  'Y = λf.λx.',
  '  f(Σ ∪ Hash(x))       if O(E(x)) ≡ VERIFIED',
  '  HALT ⊢ DIVERGENT     if K(x) ∈ SCAM',
  '  HALT ⊢ UNKNOWN       if Evidence(x) = ∅',
  '  HALT ⊢ NOT_EXECUTED  if Authority(x) < Required',
  'Reality⁄Ω∞v := Y(λf.(M(t+1) = M(t) ∪ Δ | V(Δ) = ⊤))',
  'V ≡ (Expected ≡ Observed)',
].join('\n');

export const REALITY_LOOP_VERDICTS = ['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED'] as const;
export type RealityLoopVerdict = (typeof REALITY_LOOP_VERDICTS)[number];

export type RealityHaltReason =
  | 'SCAM'
  | 'AUTHORITY_INSUFFICIENT'
  | 'EVIDENCE_EMPTY'
  | 'OBSERVED_DIVERGES_FROM_EXPECTED';

export type RealityJudgementReason = RealityHaltReason | 'REALITY_VERIFIED';

/** How `Expected ≡ Observed` is decided. Equality is the law's reading. */
export type RealityMatchMode = 'EQUAL' | 'CONTAINS';

export interface RealityAuthority {
  /** What the caller holds. A capability is not authority. */
  readonly held: number;
  /** What the transition requires. */
  readonly required: number;
}

export interface RealityDrop {
  /** Stable label for the drop; also what a memory entry is named after. */
  readonly id: string;
  /** K(x) ∈ SCAM — the shield's verdict, supplied, never inferred here. */
  readonly scam: boolean;
  /** Evidence(x). Empty means nothing was observed. */
  readonly evidence: readonly string[];
  readonly authority: RealityAuthority;
  /** Expected. Absent means no expectation was declared. */
  readonly expected: string | null;
  /** Observed. Absent means nothing was observed to compare. */
  readonly observed: string | null;
}

export interface RealityJudgement {
  readonly verdict: RealityLoopVerdict;
  readonly reason: RealityJudgementReason;
  /** V(Δ) — whether Expected ≡ Observed under the chosen mode. */
  readonly matched: boolean;
}

const sha256 = (text: string): string => `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;

const normalize = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * V ≡ (Expected ≡ Observed). With no declared expectation there is nothing to
 * contradict, so a present observation is undisputed; with no observation there
 * is nothing to verify.
 */
export function expectedEqualsObserved(
  expected: string | null,
  observed: string | null,
  mode: RealityMatchMode = 'EQUAL',
): boolean {
  if (observed === null || !observed.trim()) return false;
  if (expected === null || !expected.trim()) return true;
  return mode === 'CONTAINS'
    ? normalize(observed).includes(normalize(expected))
    : normalize(observed) === normalize(expected);
}

/**
 * Canonical, order-stable hash of one drop — the `Hash(x)` that Σ absorbs.
 * It hashes what was supplied, so it is a fingerprint of a claim, not of reality.
 */
export function hashDrop(drop: RealityDrop): string {
  return sha256(
    JSON.stringify({
      id: drop.id,
      scam: drop.scam,
      evidence: [...drop.evidence],
      authority: { held: drop.authority.held, required: drop.authority.required },
      expected: drop.expected,
      observed: drop.observed,
    }),
  );
}

/**
 * The gate. The law lists outcomes, not precedence; when several halt conditions
 * hold at once the kernel resolves them fail-closed:
 *   SCAM → AUTHORITY → EVIDENCE → VERIFICATION
 * A scam is refused before authority is weighed, authority before evidence is
 * trusted, evidence before an observation is compared.
 */
export function judgeDrop(drop: RealityDrop, mode: RealityMatchMode = 'EQUAL'): RealityJudgement {
  const matched = expectedEqualsObserved(drop.expected, drop.observed, mode);
  if (drop.scam) return { verdict: 'DIVERGENT', reason: 'SCAM', matched };
  if (drop.authority.held < drop.authority.required) {
    return { verdict: 'NOT_EXECUTED', reason: 'AUTHORITY_INSUFFICIENT', matched };
  }
  const hasEvidence = drop.evidence.some((item) => item.trim().length > 0);
  if (!hasEvidence) return { verdict: 'UNKNOWN', reason: 'EVIDENCE_EMPTY', matched };
  if (!matched) return { verdict: 'DIVERGENT', reason: 'OBSERVED_DIVERGES_FROM_EXPECTED', matched };
  return { verdict: 'VERIFIED', reason: 'REALITY_VERIFIED', matched: true };
}

/** M(t) — the hashes of drops that matched reality. Not a journal, not a claim. */
export interface RealityMemory {
  readonly drops: readonly string[];
}

export const EMPTY_REALITY_MEMORY: RealityMemory = Object.freeze({ drops: Object.freeze([]) as readonly string[] });

/**
 * M(t+1) = M(t) ∪ Δ only when V(Δ) = ⊤. Anything else returns M(t) unchanged,
 * which is the fixed point of the loop rather than a mutation.
 */
export function rememberVerified(memory: RealityMemory, drop: RealityDrop, mode: RealityMatchMode = 'EQUAL'): RealityMemory {
  const judged = judgeDrop(drop, mode);
  return judged.verdict === 'VERIFIED' ? { drops: [...memory.drops, hashDrop(drop)] } : memory;
}

export interface RealityLoopStep {
  readonly id: string;
  readonly verdict: RealityLoopVerdict;
  readonly reason: RealityJudgementReason;
  /** Whether this step's hash entered Σ. */
  readonly admitted: boolean;
  readonly memoryHeight: number;
}

export interface RealityLoopRun {
  readonly memory: RealityMemory;
  /** The step that stopped the loop, or null when every drop verified. */
  readonly halted: RealityLoopStep | null;
  readonly steps: readonly RealityLoopStep[];
  /** Drops after a halt are not executed, not remembered, and not claimed. */
  readonly unreached: number;
  readonly law: string;
}

/**
 * Y applied to (M ∪ Δ | V(Δ)=⊤) over a finite list of drops.
 *
 * Each drop either extends Σ by its hash and recurses, or halts with exactly one
 * of DIVERGENT / UNKNOWN / NOT_EXECUTED and leaves Σ at M(t).
 */
export function runRealityFixedPoint(
  drops: readonly RealityDrop[],
  seed: RealityMemory = EMPTY_REALITY_MEMORY,
  mode: RealityMatchMode = 'EQUAL',
): RealityLoopRun {
  let memory = seed;
  const steps: RealityLoopStep[] = [];
  for (let index = 0; index < drops.length; index += 1) {
    const drop = drops[index];
    const judged = judgeDrop(drop, mode);
    if (judged.verdict !== 'VERIFIED') {
      const halted: RealityLoopStep = {
        id: drop.id,
        verdict: judged.verdict,
        reason: judged.reason,
        admitted: false,
        memoryHeight: memory.drops.length,
      };
      steps.push(halted);
      return { memory, halted, steps, unreached: drops.length - index - 1, law: REALITY_FIXED_POINT_LAW };
    }
    memory = { drops: [...memory.drops, hashDrop(drop)] };
    steps.push({
      id: drop.id,
      verdict: judged.verdict,
      reason: judged.reason,
      admitted: true,
      memoryHeight: memory.drops.length,
    });
  }
  return { memory, halted: null, steps, unreached: 0, law: REALITY_FIXED_POINT_LAW };
}
