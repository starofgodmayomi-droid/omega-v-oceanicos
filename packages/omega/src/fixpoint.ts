/*
 * Ω∞v — the loop as a least fixed point.
 *
 *   Ω∞v := Y(λf. M_{t+1} = M_t ∪ { Hash(x) | V(x) = ⊤ })
 *   V(x) ≡ (Expected(x) ≡ Observed(x))
 *
 * Memory is a set of evidence hashes, so the union is monotone and idempotent:
 * a drop whose hash is already in Σ adds nothing, and the loop is at its fixed
 * point when a full pass admits nothing new.
 *
 * Every drop that is not VERIFIED halts on its own verdict and leaves memory
 * unchanged:
 *
 *   K(x) ∈ SCAM          → HALT ⊢ DIVERGENT
 *   Evidence(x) = ∅      → HALT ⊢ UNKNOWN
 *   Authority(x) < Req.  → HALT ⊢ NOT_EXECUTED
 *   Expected ≠ Observed  → HALT ⊢ DIVERGENT
 *
 * A halt ends that drop, never the ledger: the next drop is still observed.
 */
import type { AuthorityLevel } from '@oceanicos/kai';
import { sha256Hex } from './digest.js';

export type FixpointVerdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
export type FixpointHaltVerdict = Exclude<FixpointVerdict, 'VERIFIED'>;

/** One drop offered to the loop: the evidence, its expectation, and its bounds. */
export type FixpointDrop = {
  /** The observed evidence text. Empty or absent means nothing was observed. */
  observed?: string | null;
  /** The digest declared before the observation (the expectation). */
  expectedHash?: string | null;
  /** KAI Shield matched a known fraud pattern for this drop. */
  scam?: boolean;
  /** The authority this drop claims, if it claims one. */
  authority?: AuthorityLevel | null;
  /** The authority the transition requires, if one is declared. */
  requiredAuthority?: AuthorityLevel | null;
};

export type FixpointGate =
  | { verdict: 'VERIFIED'; admitted: true; hash: string; reason: null }
  | { verdict: FixpointHaltVerdict; admitted: false; hash: string | null; reason: string };

const AUTHORITY_RANK: Record<AuthorityLevel, number> = { READ_ONLY: 0, AUTONOMOUS: 1 };
const DIGEST_SHAPE = /^[0-9a-f]{64}$/;

/**
 * `V` plus the three bounds around it. Checked in order, so a scam drop is
 * never VERIFIED no matter how well its digest recomputes.
 */
export function gateDrop(drop: FixpointDrop): FixpointGate {
  if (drop.scam) {
    return {
      verdict: 'DIVERGENT',
      admitted: false,
      hash: null,
      reason: 'KAI_SHIELD_SCAM: a known fraud pattern was matched; nothing is executed or remembered.',
    };
  }

  const observed = typeof drop.observed === 'string' ? drop.observed : '';
  if (observed.trim().length === 0) {
    return {
      verdict: 'UNKNOWN',
      admitted: false,
      hash: null,
      reason: 'EVIDENCE_EMPTY: no observation was produced, so nothing can match it.',
    };
  }

  if (
    drop.authority &&
    drop.requiredAuthority &&
    AUTHORITY_RANK[drop.authority] < AUTHORITY_RANK[drop.requiredAuthority]
  ) {
    return {
      verdict: 'NOT_EXECUTED',
      admitted: false,
      hash: null,
      reason: `AUTHORITY_BELOW_REQUIRED: ${drop.authority} < ${drop.requiredAuthority}.`,
    };
  }

  const expectedHash = typeof drop.expectedHash === 'string' ? drop.expectedHash : '';
  if (!expectedHash) {
    return {
      verdict: 'UNKNOWN',
      admitted: false,
      hash: null,
      reason: 'EXPECTED_NOT_DECLARED: no expectation was recorded, so V(x) cannot be ⊤.',
    };
  }

  const hash = sha256Hex(observed);
  if (!DIGEST_SHAPE.test(expectedHash) || hash !== expectedHash) {
    return {
      verdict: 'DIVERGENT',
      admitted: false,
      hash,
      reason: 'EXPECTED_NOT_OBSERVED: the observation does not recompute to the declared digest.',
    };
  }

  return { verdict: 'VERIFIED', admitted: true, hash, reason: null };
}

export type FixpointHalt = {
  index: number;
  verdict: FixpointHaltVerdict;
  reason: string;
  hash: string | null;
};

export type FixpointResult = {
  /** Worst gate the fold saw; NOT_EXECUTED when there was nothing to fold. */
  verdict: FixpointVerdict;
  /** Σ after the fold: admitted hashes in admission order. */
  memory: string[];
  /** How many drops actually grew Σ (a repeated hash does not). */
  admitted: number;
  /** Drops that halted, each with its own verdict. */
  halted: FixpointHalt[];
  steps: number;
  /** A second pass over the same drops admits nothing: M is the fixed point. */
  fixed: boolean;
};

const RANK: Record<FixpointVerdict, number> = {
  VERIFIED: 0,
  NOT_EXECUTED: 1,
  UNKNOWN: 2,
  DIVERGENT: 3,
};

function worst(verdicts: readonly FixpointVerdict[]): FixpointVerdict {
  if (verdicts.length === 0) return 'NOT_EXECUTED';
  return verdicts.reduce((worstSoFar, verdict) =>
    RANK[verdict] > RANK[worstSoFar] ? verdict : worstSoFar
  );
}

/**
 * Fold drops into memory with `Y`. Only VERIFIED hashes are unioned in; a hash
 * already present adds nothing, so the second pass is the fixed-point proof.
 */
export function omegaFixpoint(
  drops: readonly FixpointDrop[],
  seed: readonly string[] = []
): FixpointResult {
  const memory = [...new Set(seed.filter((hash) => DIGEST_SHAPE.test(hash)))];
  const halted: FixpointHalt[] = [];
  let admitted = 0;
  const verdicts: FixpointVerdict[] = [];

  for (const [index, drop] of drops.entries()) {
    const gate = gateDrop(drop);
    if (!gate.admitted) {
      halted.push({ index, verdict: gate.verdict, reason: gate.reason, hash: gate.hash });
      verdicts.push(gate.verdict);
      continue;
    }
    if (memory.includes(gate.hash)) {
      // Already in Σ: the observation confirms memory, it does not grow it.
      verdicts.push('VERIFIED');
      continue;
    }
    memory.push(gate.hash);
    admitted += 1;
    verdicts.push('VERIFIED');
  }

  const settled = new Set(memory);
  const fixed = !drops.some((drop) => {
    const gate = gateDrop(drop);
    return gate.admitted && !settled.has(gate.hash);
  });

  return { verdict: worst(verdicts), memory, admitted, halted, steps: drops.length, fixed };
}
