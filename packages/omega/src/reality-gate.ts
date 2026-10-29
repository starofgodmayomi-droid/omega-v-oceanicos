/*
 * OMEGA — the reality gate: the Ω∞v fixed point as a finite step.
 *
 *   Ω∞v := Y(λf. M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤)
 *   V(Δ) ≡ (Expected ≡ Observed)
 *
 * One delta per step. A step either grows the accumulated set Σ with the hash
 * of a delta that matched reality, or it halts:
 *
 *   f(Σ ∪ Hash(x))      if O(E(x)) ≡ VERIFIED
 *   HALT ⊢ DIVERGENT    if K(x) ∈ SCAM
 *   HALT ⊢ UNKNOWN      if Evidence(x) = ∅
 *   HALT ⊢ NOT_EXECUTED if Authority(x) < Required
 *
 * A halt is a successful outcome: it is what keeps memory equal to reality.
 * Memory only ever grows, and only with deltas that survived the gate.
 *
 * Declared reading: the three halt guards are checked before the commit
 * branch. A fraud intent is therefore never committed even when an
 * observation happens to match, and an unobserved delta is UNKNOWN rather
 * than DIVERGENT. The branch set is the supplied one; only the guard order
 * is made fail-closed and explicit.
 */
import { createHash } from 'node:crypto';
import { scanIntent, type AuthorityLevel } from '@oceanicos/kai';

/** First link of every reality memory chain. */
export const REALITY_MEMORY_GENESIS = 'omega-reality-memory-genesis-v1';

export type RealityGateStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

/**
 * The two authority levels this repository declares. The rank only orders
 * them for comparison — a rank is not a permission, and a capability is not
 * authority.
 */
export const AUTHORITY_RANK: Readonly<Record<AuthorityLevel, number>> = {
  READ_ONLY: 0,
  AUTONOMOUS: 1,
};

/** x — one candidate delta, with the authority it claims and the one it needs. */
export interface RealityDelta {
  readonly intent: string;
  readonly expected: string;
  readonly observed?: string | null;
  readonly authorityLevel: AuthorityLevel;
  readonly requiredAuthority: AuthorityLevel;
}

/** One link of Σ: the hash of a committed delta, chained to the link before it. */
export interface RealityMemoryEntry {
  readonly index: number;
  readonly deltaHash: string;
  readonly evidenceHash: string;
  readonly previousHash: string;
  readonly entryHash: string;
  readonly recordedAt: string;
}

export interface RealityStep {
  readonly status: RealityGateStatus;
  readonly committed: boolean;
  readonly reason: string;
  readonly expected: string;
  readonly observed: string | null;
  readonly entry: RealityMemoryEntry | null;
  readonly memoryTip: string;
  readonly memorySize: number;
}

export interface RealityMemoryOptions {
  readonly now?: () => string;
  readonly genesis?: string;
}

export interface RealityMemory {
  step(delta: RealityDelta): RealityStep;
  entries(): readonly RealityMemoryEntry[];
  tip(): string;
  size(): number;
  holds(deltaHash: string): boolean;
  verifyChain(): boolean;
}

const sha256 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

/**
 * M — the accumulated set, held as an append-only hash chain. `step` is the
 * only way to grow it, and it grows only on `V(Δ) = ⊤`.
 */
export function createRealityMemory(options: RealityMemoryOptions = {}): RealityMemory {
  const now = options.now ?? (() => new Date().toISOString());
  const genesis = options.genesis ?? REALITY_MEMORY_GENESIS;
  const entries: RealityMemoryEntry[] = [];
  const committedHashes = new Set<string>();
  let tip = genesis;

  const halt = (
    status: Exclude<RealityGateStatus, 'VERIFIED'>,
    reason: string,
    expected: string,
    observed: string | null,
  ): RealityStep => ({
    status,
    committed: false,
    reason,
    expected,
    observed,
    entry: null,
    memoryTip: tip,
    memorySize: entries.length,
  });

  const step = (delta: RealityDelta): RealityStep => {
    const expected = (delta.expected ?? '').trim();
    const observed = typeof delta.observed === 'string' ? delta.observed.trim() : '';

    // K(x) ∈ SCAM — the Shield guards the commit branch, it is not a suggestion.
    const shield = scanIntent(delta.intent ?? '');
    if (shield.blocked) {
      return halt(
        'DIVERGENT',
        `K(x) ∈ SCAM (${shield.matchedPatternIds.join(', ')}). HALT ⊢ DIVERGENT — a fraud intent is never committed.`,
        expected,
        observed.length > 0 ? observed : null,
      );
    }

    // Evidence(x) = ∅ — no observation means no comparison.
    if (observed.length === 0) {
      return halt(
        'UNKNOWN',
        'Evidence(x) = ∅. HALT ⊢ UNKNOWN — an unobserved delta is never committed.',
        expected,
        null,
      );
    }

    // Authority(x) < Required — capability is not authority.
    if (AUTHORITY_RANK[delta.authorityLevel] < AUTHORITY_RANK[delta.requiredAuthority]) {
      return halt(
        'NOT_EXECUTED',
        `Authority(x) = ${delta.authorityLevel} < Required = ${delta.requiredAuthority}. HALT ⊢ NOT_EXECUTED — capability is not authority.`,
        expected,
        observed,
      );
    }

    // V(Δ) ≡ (Expected ≡ Observed)
    if (expected !== observed) {
      return halt(
        'DIVERGENT',
        'V(Δ) = ⊥: Observed ≠ Expected. HALT ⊢ DIVERGENT — both states are kept.',
        expected,
        observed,
      );
    }

    const deltaHash = sha256(JSON.stringify({ intent: delta.intent, expected, observed }));
    if (committedHashes.has(deltaHash)) {
      return {
        status: 'VERIFIED',
        committed: true,
        reason: 'Δ already ∈ Σ: M ∪ Δ = M. Nothing was appended.',
        expected,
        observed,
        entry: null,
        memoryTip: tip,
        memorySize: entries.length,
      };
    }

    const evidenceHash = sha256(
      JSON.stringify({
        expected,
        observed,
        authorityLevel: delta.authorityLevel,
        requiredAuthority: delta.requiredAuthority,
      }),
    );
    const entry: RealityMemoryEntry = {
      index: entries.length,
      deltaHash,
      evidenceHash,
      previousHash: tip,
      entryHash: sha256(`${tip}\n${deltaHash}\n${evidenceHash}`),
      recordedAt: now(),
    };
    entries.push(entry);
    committedHashes.add(deltaHash);
    tip = entry.entryHash;

    return {
      status: 'VERIFIED',
      committed: true,
      reason: 'V(Δ) = ⊤: Σ ∪ Hash(x). The delta was appended to memory.',
      expected,
      observed,
      entry,
      memoryTip: tip,
      memorySize: entries.length,
    };
  };

  return {
    step,
    entries: () => entries.map((entry) => ({ ...entry })),
    tip: () => tip,
    size: () => entries.length,
    holds: (deltaHash: string) => committedHashes.has(deltaHash),
    verifyChain: () => {
      let previous = genesis;
      for (const entry of entries) {
        if (entry.previousHash !== previous) return false;
        if (entry.entryHash !== sha256(`${previous}\n${entry.deltaHash}\n${entry.evidenceHash}`)) {
          return false;
        }
        previous = entry.entryHash;
      }
      return previous === tip;
    },
  };
}

export interface RealityLoop {
  readonly memory: RealityMemory;
  readonly steps: readonly RealityStep[];
  readonly committed: number;
  readonly haltedAt: number | null;
  readonly status: RealityGateStatus;
}

/**
 * Y — one finite pass of the loop. Each VERIFIED step feeds its hash back into
 * the same memory (`f(Σ ∪ Hash(x))`); the first halt ends the pass, so the
 * recursion is bounded by its input. An empty pass is NOT_EXECUTED: the loop
 * never starts itself, and nothing runs unattended.
 */
export function runRealityLoop(
  deltas: readonly RealityDelta[],
  memory: RealityMemory = createRealityMemory(),
): RealityLoop {
  const steps: RealityStep[] = [];
  for (let index = 0; index < deltas.length; index += 1) {
    const step = memory.step(deltas[index]);
    steps.push(step);
    if (!step.committed) {
      return {
        memory,
        steps,
        committed: steps.length - 1,
        haltedAt: index,
        status: step.status,
      };
    }
  }
  return {
    memory,
    steps,
    committed: steps.length,
    haltedAt: null,
    status: steps.length > 0 ? 'VERIFIED' : 'NOT_EXECUTED',
  };
}
