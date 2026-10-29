/**
 * Reality////Ω∞v — the verified fixed point.
 *
 *   Reality////Ω∞v := Y(λf. (M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤))
 *   V ≡ (Expected ≡ Observed)
 *
 *   HALT ⊢ VERIFIED      if O(E(x)) ≡ VERIFIED
 *   HALT ⊢ DIVERGENT     if K(x) ∈ SCAM
 *   HALT ⊢ UNKNOWN       if Evidence(x) = ∅
 *   HALT ⊢ NOT_EXECUTED  if Authority(x) < Required
 *
 * `Y` is the finite sequence of drops the caller supplies, not an unattended
 * process: one pass runs one transition per drop, admits a Δ into memory only
 * when its observation equals its expectation, and halts on the first drop it
 * cannot verify. Memory is the union of admitted Δ — nothing unverified is
 * remembered. A caller that wants the loop to continue runs the next pass with
 * the returned `memory`.
 *
 * The authority guard is evaluated first even though the notation lists it
 * last: a drop that was never authorized was never executed, so it cannot have
 * produced an observation to compare. CAPABILITY is not AUTHORITY.
 */
import { isDeepStrictEqual } from 'node:util';

export type ContinuumVerdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface ContinuumDrop<T> {
  /** Δ — the change this drop proposes. */
  readonly delta: T;
  /** Expected — the state this drop claims to produce. */
  readonly expected: unknown;
  /** Observed — what was actually observed. Absent means nothing was observed. */
  readonly observed?: unknown;
  /** Evidence(x) — the references this drop can be checked against. */
  readonly evidence: readonly string[];
  /** Authority(x) — the authority actually held, and the authority required. */
  readonly authority: number;
  readonly requiredAuthority: number;
  /** K(x) ∈ SCAM — the drop's intent matched a known harm pattern. */
  readonly scam?: boolean;
}

export interface ContinuumStep<T> {
  readonly index: number;
  readonly verdict: ContinuumVerdict;
  readonly evidence: string;
  readonly expected?: unknown;
  readonly observed?: unknown;
  /** True only when the verdict is VERIFIED and Δ entered memory. */
  readonly admitted: boolean;
  /** M at this step — admitted Δ only. */
  readonly memory: readonly T[];
}

export interface ContinuumRun<T> {
  readonly status: ContinuumVerdict;
  /** M — only verified Δ, in admission order. */
  readonly memory: readonly T[];
  readonly steps: readonly ContinuumStep<T>[];
  /** True when a drop halted the loop; false when the supplied drops ran out. */
  readonly halted: boolean;
}

export interface ContinuumDecision {
  readonly verdict: ContinuumVerdict;
  readonly evidence: string;
}

/**
 * Decide one drop against the operator's guards. This reads the supplied
 * fields only; it does not execute, observe, or infer anything.
 */
export function decideContinuumDrop<T>(drop: ContinuumDrop<T>): ContinuumDecision {
  if (!Number.isFinite(drop.authority) || drop.authority < drop.requiredAuthority) {
    return {
      verdict: 'NOT_EXECUTED',
      evidence: `Authority(x) ${drop.authority} < Required ${drop.requiredAuthority}`,
    };
  }
  if (drop.evidence.length === 0) {
    return { verdict: 'UNKNOWN', evidence: 'Evidence(x) = ∅' };
  }
  if (drop.scam === true) {
    return { verdict: 'DIVERGENT', evidence: 'K(x) ∈ SCAM: intent matched a known harm pattern' };
  }
  if (drop.observed === undefined) {
    return { verdict: 'UNKNOWN', evidence: 'no observation was supplied, so nothing was compared' };
  }
  if (!isDeepStrictEqual(drop.expected, drop.observed)) {
    return { verdict: 'DIVERGENT', evidence: 'Expected ≠ Observed' };
  }
  return { verdict: 'VERIFIED', evidence: 'Expected ≡ Observed' };
}

/**
 * Run one finite pass of Reality////Ω∞v over the supplied drops.
 *
 * `memory` may seed M from a previous pass; the returned memory is that union
 * plus every Δ this pass admitted.
 */
export function runContinuum<T>(
  drops: readonly ContinuumDrop<T>[],
  options: { readonly memory?: readonly T[] } = {},
): ContinuumRun<T> {
  const memory: T[] = [...(options.memory ?? [])];
  const steps: ContinuumStep<T>[] = [];

  for (let index = 0; index < drops.length; index += 1) {
    const drop = drops[index];
    const decision = decideContinuumDrop(drop);
    const admitted = decision.verdict === 'VERIFIED' && !memory.includes(drop.delta);
    if (admitted) memory.push(drop.delta);
    steps.push({
      index,
      verdict: decision.verdict,
      evidence: decision.evidence,
      expected: drop.expected,
      observed: drop.observed,
      admitted,
      memory: [...memory],
    });
    if (decision.verdict !== 'VERIFIED') {
      return { status: decision.verdict, memory, steps, halted: true };
    }
  }

  return { status: 'VERIFIED', memory, steps, halted: false };
}
