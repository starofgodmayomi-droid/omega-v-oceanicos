/**
 * OMEGA — the Judge of the Ω∞v body.
 *
 * Reconciles a declared expected value against a declared observed value by
 * canonical digest. It fails closed: a missing or unserializable value is
 * UNKNOWN, never VERIFIED. Digest equality is evidence about those two
 * declared values only — it never claims external reality.
 *
 * `stepFixpoint` is one turn of the body's law:
 *
 *   Ω∞v = Y(λf.λx.
 *     f(Σ ∪ Hash(x))                if O(E(x)) ≡ VERIFIED
 *     HALT ⊢ DIVERGENT              if K(x) ∈ SCAM
 *     HALT ⊢ UNKNOWN                if Evidence(x) = ∅
 *     HALT ⊢ NOT_EXECUTED           if Authority(x) < Required)
 *
 *   Reality////Ω∞v := Y(λf.(M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤))
 *   V ≡ (Expected ≡ Observed)
 */
import { createHash } from 'node:crypto';

export type GateStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

export interface GateResult {
  readonly status: GateStatus;
  readonly expectedDigest: string | null;
  readonly observedDigest: string | null;
  readonly unknowns: readonly string[];
  readonly scope: 'declared-values';
  readonly realityClaimed: false;
  readonly reason: string;
}

const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalize(record[key]);
        return acc;
      }, {});
  }
  return value;
};

/** SHA-256 over canonical JSON. Returns null for undefined or unserializable input. */
export const digestOf = (value: unknown): string | null => {
  if (value === undefined) return null;
  try {
    const canonical = JSON.stringify(normalize(value));
    if (canonical === undefined) return null;
    return createHash('sha256').update(canonical).digest('hex');
  } catch {
    return null;
  }
};

export const reconcile = (expected: unknown, observed: unknown): GateResult => {
  const expectedDigest = digestOf(expected);
  const observedDigest = digestOf(observed);
  const unknowns: string[] = [];
  if (expectedDigest === null) unknowns.push('EXPECTED_UNKNOWN');
  if (observedDigest === null) unknowns.push('OBSERVED_UNKNOWN');

  if (expectedDigest === null || observedDigest === null) {
    return {
      status: 'UNKNOWN',
      expectedDigest,
      observedDigest,
      unknowns,
      scope: 'declared-values',
      realityClaimed: false,
      reason: 'A value is missing or unserializable; the gate fails closed.',
    };
  }

  if (expectedDigest !== observedDigest) {
    return {
      status: 'DIVERGENT',
      expectedDigest,
      observedDigest,
      unknowns,
      scope: 'declared-values',
      realityClaimed: false,
      reason: 'Declared expected and observed digests differ.',
    };
  }

  return {
    status: 'VERIFIED',
    expectedDigest,
    observedDigest,
    unknowns,
    scope: 'declared-values',
    realityClaimed: false,
    reason:
      'Declared values reconcile by digest. External reality still requires observation.',
  };
};

export class OmegaGateRefusal extends Error {
  public readonly result: GateResult;

  constructor(result: GateResult) {
    super(`OMEGA_GATE_REFUSED: ${result.status}`);
    this.name = 'OmegaGateRefusal';
    this.result = result;
  }
}

/** Return the result only when VERIFIED; otherwise throw. Fails closed. */
export const requireVerified = (result: GateResult): GateResult => {
  if (result.status !== 'VERIFIED') {
    throw new OmegaGateRefusal(result);
  }
  return result;
};

/**
 * The Ω∞v fixpoint — the body's recursion, made finite.
 *
 *   Ω∞v = Y(λf.λx.
 *     f(Σ ∪ Hash(x))                if O(E(x)) ≡ VERIFIED
 *     HALT ⊢ DIVERGENT              if K(x) ∈ SCAM
 *     HALT ⊢ UNKNOWN                if Evidence(x) = ∅
 *     HALT ⊢ NOT_EXECUTED           if Authority(x) < Required)
 *
 *   Reality////Ω∞v := Y(λf.(M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤))
 *   V ≡ (Expected ≡ Observed)
 *
 * One call is one turn of `f`. Memory Σ grows only by the digest of a delta
 * that reconciled, and the union is a set: a repeated delta does not remember
 * twice. Every halting branch leaves Σ untouched, so the body remembers only
 * what matched its declared observation. The continuous loop is the process
 * applying this turn again — this function never starts one on its own.
 */

export type FixpointVerdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface FixpointInput<T> {
  /** x — the delta the body wants to make real. */
  readonly value: T;
  /** K(x) ∈ SCAM — the deterministic shield's verdict. */
  readonly scam: boolean;
  /** Evidence(x) ≠ ∅. */
  readonly evidence: boolean;
  /** Authority(x) ≥ Required. */
  readonly authority: boolean;
  /** ELION's execution of x. Reached only when the halting gates pass. */
  readonly execute: () => T | Promise<T>;
}

export interface FixpointTurn<T> {
  readonly verdict: FixpointVerdict;
  readonly halted: boolean;
  readonly executed: boolean;
  /** Σ after this turn. */
  readonly memory: readonly string[];
  /** Hash(x) from the verified observation; null when the turn halted. */
  readonly delta: string | null;
  /** Whether this turn added the delta to Σ (set union). */
  readonly remembered: boolean;
  readonly verification: GateResult | null;
  readonly observed?: T;
  readonly reason: string;
}

export const EMPTY_MEMORY: readonly string[] = Object.freeze([]);

const halt = <T>(
  verdict: FixpointVerdict,
  memory: readonly string[],
  reason: string,
  extra: Partial<FixpointTurn<T>> = {},
): FixpointTurn<T> => ({
  verdict,
  halted: true,
  executed: false,
  memory,
  delta: null,
  remembered: false,
  verification: null,
  reason,
  ...extra,
});

export const stepFixpoint = async <T>(
  input: FixpointInput<T>,
  memory: readonly string[] = EMPTY_MEMORY,
): Promise<FixpointTurn<T>> => {
  // 1. K(x) ∈ SCAM — the shield halts before anything moves.
  if (input.scam) {
    return halt('DIVERGENT', memory, 'K(x) ∈ SCAM: the shield halted the turn before execution.');
  }

  // 2. Evidence(x) = ∅ — UNKNOWN is preserved, never guessed past.
  if (!input.evidence) {
    return halt('UNKNOWN', memory, 'Evidence(x) = ∅: the fixpoint preserves UNKNOWN.');
  }

  // 3. Authority(x) < Required — the hands do not move.
  if (!input.authority) {
    return halt('NOT_EXECUTED', memory, 'Authority(x) < Required: ELION did not execute.');
  }

  let observed: T;
  try {
    observed = await input.execute();
  } catch (error) {
    return halt(
      'UNKNOWN',
      memory,
      `EXECUTION_FAILED: ${error instanceof Error ? error.message : String(error)}`,
      { executed: true },
    );
  }

  // 4. V(Δ) ≡ (Expected ≡ Observed).
  const verification = reconcile(input.value, observed);
  if (verification.status !== 'VERIFIED') {
    return halt(verification.status, memory, verification.reason, {
      executed: true,
      verification,
      observed,
    });
  }

  // 5. f(Σ ∪ Hash(x)) — the confirmed delta joins memory once.
  const delta = verification.observedDigest;
  const remembered = delta !== null && !memory.includes(delta);
  const nextMemory = remembered && delta !== null ? [...memory, delta] : memory;

  return {
    verdict: 'VERIFIED',
    halted: false,
    executed: true,
    memory: nextMemory,
    delta,
    remembered,
    verification,
    observed,
    reason: 'O(E(x)) ≡ VERIFIED: the confirmed delta joined Σ.',
  };
};
