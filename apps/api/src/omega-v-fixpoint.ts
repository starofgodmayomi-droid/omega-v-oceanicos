/*
 * Ω∞v — the formal fixed-point specification of the Invisible Online Computer.
 *
 *   Ω∞v = Y(λf.λx. {
 *     f(Σ ∪ Hash(x))         if O(E(x)) ≡ VERIFIED
 *     HALT ⊢ DIVERGENT       if K(x) ∈ SCAM
 *     HALT ⊢ UNKNOWN         if Evidence(x) = ∅
 *     HALT ⊢ NOT_EXECUTED     if Authority(x) < Required
 *   }
 *
 *   Reality := Y(λf.(M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤))
 *   V ≡ (Expected ≡ Observed)
 *
 * "The ecosystem is a continuous, infinite loop that only remembers what matches reality."
 */

/** Authority levels, ordered READ_ONLY < AUTONOMOUS. */
export const AUTHORITY_RANK: Record<string, number> = {
  READ_ONLY: 1,
  AUTONOMOUS: 2,
};

/**
 * Authority gate — HALT ⊢ NOT_EXECUTED if Authority(x) < Required.
 * Returns true when the requested authority is within the system's maximum.
 */
export function authoritySufficient(requested: string, max: string): boolean {
  const requestedRank = AUTHORITY_RANK[requested];
  const maxRank = AUTHORITY_RANK[max];
  if (requestedRank === undefined || maxRank === undefined) return false;
  return requestedRank <= maxRank;
}

/**
 * V ≡ (Expected ≡ Observed) — the verification identity.
 * Expected and observed must be identical for the delta to enter reality.
 */
export function verificationIdentity(expected: string, observed: string): boolean {
  return expected === observed;
}

/**
 * Reality accumulation: M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤.
 * A delta enters memory only when the verification identity holds.
 * The original memory is never mutated; a new array is returned.
 */
export function realityStep<T>(
  memory: readonly T[],
  delta: T,
  verify: (d: T) => boolean
): { memory: T[]; admitted: boolean } {
  if (verify(delta)) {
    return { memory: [...memory, delta], admitted: true };
  }
  return { memory: [...memory], admitted: false };
}

/** The formal specification, serializable for the API and UI. */
export const OMEGA_V_SPEC = {
  fixpoint:
    'Ω∞v = Y(λf.λx. { f(Σ ∪ Hash(x)) if O(E(x))≡VERIFIED | HALT⊢DIVERGENT if K(x)∈SCAM | HALT⊢UNKNOWN if Evidence(x)=∅ | HALT⊢NOT_EXECUTED if Authority(x)<Required })',
  reality: 'Reality := Y(λf.(M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤))',
  verification: 'V ≡ (Expected ≡ Observed)',
  principle:
    'The ecosystem is a continuous, infinite loop that only remembers what matches reality.',
} as const;
