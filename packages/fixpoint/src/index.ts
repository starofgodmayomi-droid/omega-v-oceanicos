import { scanIntent, scanIrreversible, type AuthorityLevel } from '@oceanicos/kai';
import { executeElion, type ElionResult } from '@oceanicos/elion';
import { sha256Hex, verifyOmega } from '@oceanicos/omega';

/*
 * Ω∞v — the fixed point of the body.
 *
 *   Ω∞v := Y(λf.λx.
 *     f(Σ ∪ Hash(x))            if O(E(x)) ≡ VERIFIED
 *     HALT ⊢ DIVERGENT          if K(x) ∈ SCAM
 *     HALT ⊢ UNKNOWN            if Evidence(x) = ∅
 *     HALT ⊢ NOT_EXECUTED       if Authority(x) < Required)
 *
 *   Reality //// Ω∞v := Y(λf. (M(t+1) = M(t) ∪ Δ | V(Δ) = ⊤)), V ≡ (Expected ≡ Observed)
 *
 * The recursion is real and bounded: one pass per drop, and the first drop that
 * does not reconcile with reality halts the loop. Σ only ever grows by evidence
 * hashes whose expected outcome was observed — nothing else is remembered.
 *
 * The four halt verdicts are the whole of the body's stop set. There is no fifth.
 */

export type FixpointVerdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

/** Y — the fixed-point combinator: `fixpoint(f) = f(fixpoint(f))`, unnamed. */
export function fixpoint<A, B>(
  step: (recurse: (input: A) => B) => (input: A) => B
): (input: A) => B {
  type Self = (self: Self) => (input: A) => B;
  const make: Self = (self) => step((input: A) => self(self)(input));
  return make(make);
}

/** One 🕳️ receipt: what a single drop actually resolved to. */
export type FixpointPass = {
  index: number;
  intent: string;
  verdict: FixpointVerdict;
  detail: string;
  evidenceHash: string | null;
};

export type FixpointReceipt = {
  /** VERIFIED means every drop reconciled; otherwise the halting verdict. */
  status: FixpointVerdict;
  /** Index of the drop that halted the loop, or null when the loop completed. */
  haltedAt: number | null;
  detail: string;
  /** Σ — evidence hashes of verified deltas, in order. Grows only on V(Δ) = ⊤. */
  memory: readonly string[];
  passes: readonly FixpointPass[];
};

export type FixpointInput = {
  drops: readonly string[];
  /** Injectable for tests; defaults to ELION's bounded executor. */
  execute?: (intent: string, authorityLevel: AuthorityLevel) => Promise<ElionResult>;
};

export const MAX_DROPS = 8;
export const MAX_DROP_LENGTH = 2000;

type LoopState = {
  index: number;
  memory: readonly string[];
  passes: readonly FixpointPass[];
};

/**
 * Reality //// Ω∞v — run the body's recursion over a bounded list of drops (💧).
 *
 * Each verified drop appends `Hash(x)` to Σ and recurses on the next drop;
 * every other branch halts and leaves Σ exactly as it was.
 */
export async function runOceanicFixpoint(input: FixpointInput): Promise<FixpointReceipt> {
  const drops = input.drops.map((drop) => drop.trim());
  if (drops.length === 0 || drops.length > MAX_DROPS) {
    throw new RangeError(`a fixpoint run takes 1..${MAX_DROPS} drops, received ${drops.length}`);
  }
  if (drops.some((drop) => drop.length === 0 || drop.length > MAX_DROP_LENGTH)) {
    throw new RangeError(`every drop must be 1..${MAX_DROP_LENGTH} characters`);
  }

  const execute = input.execute ?? executeElion;

  const halt = (
    state: LoopState,
    verdict: FixpointVerdict,
    detail: string,
    evidenceHash: string | null,
    intent: string
  ): FixpointReceipt => ({
    status: verdict,
    haltedAt: state.index,
    detail,
    memory: state.memory,
    passes: [
      ...state.passes,
      { index: state.index, intent, verdict, detail, evidenceHash },
    ],
  });

  const loop = fixpoint<LoopState, Promise<FixpointReceipt>>((recurse) => async (state) => {
    if (state.index >= drops.length) {
      return {
        status: 'VERIFIED',
        haltedAt: null,
        detail: `Every drop reconciled with reality; ${state.memory.length} verified delta(s) join memory.`,
        memory: state.memory,
        passes: state.passes,
      };
    }

    const intent = drops[state.index];

    // K(x) ∈ SCAM → HALT ⊢ DIVERGENT
    const shield = scanIntent(intent);
    if (shield.blocked) {
      return halt(
        state,
        'DIVERGENT',
        `K(x) ∈ SCAM: matched ${shield.matchedLabels.join(', ')}. Nothing was executed or remembered.`,
        null,
        intent
      );
    }

    // Authority(x) < Required → HALT ⊢ NOT_EXECUTED
    const required = scanIrreversible(intent);
    if (required.required) {
      return halt(
        state,
        'NOT_EXECUTED',
        `Authority(x) < Required: the LUCID gate held this drop back (${required.matchedLabels.join(', ')}); no human authorization was supplied to this run.`,
        null,
        intent
      );
    }

    // E(x) — bounded execution at read-only authority.
    const elion = await execute(intent, 'READ_ONLY');

    // Evidence(x) = ∅ → HALT ⊢ UNKNOWN
    if (!elion.output.trim()) {
      return halt(
        state,
        'UNKNOWN',
        `Evidence(x) = ∅: ${elion.error ?? 'empty output'} from ${elion.engine}. Nothing was remembered.`,
        null,
        intent
      );
    }

    // O(E(x)) — the judge recomputes the digest from the observed text.
    const evidenceHash = sha256Hex(elion.output);
    const omega = verifyOmega({ output: elion.output, evidenceHash, authorityLevel: 'READ_ONLY' });

    // Expected ≢ Observed → HALT ⊢ DIVERGENT (both sides stay in the receipt)
    if (omega.status !== 'VERIFIED') {
      return halt(
        state,
        'DIVERGENT',
        omega.reason ?? 'Expected ≢ Observed. Both sides stay in this receipt; nothing was remembered.',
        evidenceHash,
        intent
      );
    }

    // O(E(x)) ≡ VERIFIED → f(Σ ∪ Hash(x))
    return recurse({
      index: state.index + 1,
      memory: [...state.memory, evidenceHash],
      passes: [
        ...state.passes,
        {
          index: state.index,
          intent,
          verdict: 'VERIFIED',
          detail: `Reconciled via ${elion.engine}; evidence ${evidenceHash.slice(0, 12)}… joins memory.`,
          evidenceHash,
        },
      ],
    });
  });

  return loop({ index: 0, memory: [], passes: [] });
}
