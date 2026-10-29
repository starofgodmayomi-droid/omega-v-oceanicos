import { createHash } from 'node:crypto';

/**
 * Ω∞v fixed point.
 *
 *   Ω∞v = Y(λf.λx.
 *     f(Σ ∪ Hash(x))        if O(E(x)) ≡ VERIFIED
 *     HALT ⊢ DIVERGENT      if K(x) ∈ SCAM
 *     HALT ⊢ UNKNOWN        if Evidence(x) = ∅
 *     HALT ⊢ NOT_EXECUTED   if Authority(x) < Required )
 *
 *   Reality////Ω∞v := Y(λf.(M_{t+1} = M_t ∪ Δ ∣ V(Δ) = ⊤))
 *   V ≡ (Expected ≡ Observed)
 *
 * Interpretation used by this module:
 *
 * - `Σ` is a set of committed delta hashes. `M` grows monotonically; a delta
 *   is committed only when its observed state equals its expected state.
 * - `Y` is the ordinary call-by-value fixed-point combinator over the
 *   monotone growth operator. Because `Σ` is a set and `Hash` is
 *   deterministic, the recursion terminates at the fixed point (Tarski)
 *   instead of diverging: once a hash is in `Σ`, adding it again is a no-op.
 * - The four halts are evaluated in the order written above. `O(E(x))`
 *   presupposes an execution that authority permitted and evidence supports,
 *   so an observation cannot verify a change that was never authorized,
 *   never evidenced, or already known to be a scam.
 */

export type OmegaVerdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export type OmegaHaltReason =
  | 'FIXED_POINT'
  | 'KNOWN_SCAM'
  | 'EMPTY_EVIDENCE'
  | 'INSUFFICIENT_AUTHORITY'
  | 'OBSERVATION_MISMATCH'
  | 'DEPTH_EXHAUSTED';

/** The empty axiom: `Σ` before anything has matched reality. */
export const OMEGA_EMPTY_ROOT = 'Ø';

/** Human-readable form of the operator, safe to render next to its results. */
export const OMEGA_FIXPOINT_OPERATOR: readonly string[] = [
  'Ω∞v = Y(λf.λx. …)',
  '  O(E(x)) ≡ VERIFIED   → f(Σ ∪ Hash(x))',
  '  K(x) ∈ SCAM          → HALT ⊢ DIVERGENT',
  '  Evidence(x) = ∅      → HALT ⊢ UNKNOWN',
  '  Authority(x) < Req   → HALT ⊢ NOT_EXECUTED',
  'Reality////Ω∞v := Y(λf.(Mₜ₊₁ = Mₜ ∪ Δ ∣ Expected ≡ Observed))',
];

export interface OmegaDelta {
  /** The state the change was supposed to produce. */
  readonly expected: string;
  /** The state actually observed. Absent means nothing was observed. */
  readonly observed?: string;
  /** Evidence references. Empty means Evidence(x) = ∅. */
  readonly evidence?: readonly string[];
  /** Explicit knowledge that x is a known scam. Never inferred. */
  readonly knownScam?: boolean;
  /** Authority held by the actor; defaults to 0 (none). */
  readonly authority?: number;
  /** Authority the change requires; defaults to 0. */
  readonly requiredAuthority?: number;
  readonly consequence?: string;
}

export interface OmegaMemoryEntry {
  readonly sequence: number;
  readonly deltaHash: string;
  readonly expected: string;
  readonly observed: string;
  readonly evidence: readonly string[];
  readonly consequence: string;
  readonly previousRoot: string;
  readonly root: string;
  readonly committedAt: string;
}

/** `Σ` — the accumulated, monotone set of deltas that matched reality. */
export interface OmegaFixpointState {
  readonly root: string;
  readonly size: number;
  readonly entries: readonly OmegaMemoryEntry[];
}

export interface OmegaOperatorResult {
  readonly verdict: OmegaVerdict;
  /** True when the loop stops here. A committed delta continues instead. */
  readonly halted: boolean;
  readonly haltReason?: OmegaHaltReason;
  /** True only when this delta grew `Σ` (V(Δ) = ⊤ and Hash(x) was new). */
  readonly committed: boolean;
  readonly deltaHash: string;
  readonly expected: string;
  readonly observed?: string;
  readonly evidence: readonly string[];
  readonly consequence: string;
  readonly evaluatedAt: string;
  readonly state: OmegaFixpointState;
}

export interface OmegaFixpointOptions {
  readonly state?: OmegaFixpointState;
  readonly now?: () => string;
  readonly maxSteps?: number;
}

export interface OmegaFixpointRun {
  readonly state: OmegaFixpointState;
  readonly steps: readonly OmegaOperatorResult[];
  readonly halted: boolean;
  readonly haltReason: OmegaHaltReason;
  readonly verdicts: Readonly<Record<OmegaVerdict, number>>;
}

export const createOmegaFixpointState = (): OmegaFixpointState => ({
  root: OMEGA_EMPTY_ROOT,
  size: 0,
  entries: [],
});

const normaliseEvidence = (evidence: readonly string[] | undefined): string[] =>
  [...(evidence ?? [])].map((ref) => ref.trim()).filter(Boolean).sort();

const authority = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

const canonicalDelta = (delta: OmegaDelta): string =>
  JSON.stringify({
    expected: delta.expected,
    observed: delta.observed ?? null,
    evidence: normaliseEvidence(delta.evidence),
    knownScam: delta.knownScam === true,
    authority: authority(delta.authority),
    requiredAuthority: authority(delta.requiredAuthority),
    consequence: delta.consequence?.trim() ?? '',
  });

/** `Hash(x)` — deterministic, so repetition is detectable and the loop converges. */
export const omegaDeltaHash = (delta: OmegaDelta): string =>
  createHash('sha256').update(canonicalDelta(delta)).digest('hex');

const commitRoot = (previousRoot: string, deltaHash: string, sequence: number, committedAt: string): string =>
  createHash('sha256')
    .update(JSON.stringify({ previousRoot, deltaHash, sequence, committedAt }))
    .digest('hex');

/**
 * The call-by-value Y combinator:
 *   Y f = f (Y f)
 */
export function omegaY<A, R>(f: (self: (input: A) => R) => (input: A) => R): (input: A) => R {
  const fix = (self: (inner: (input: A) => R) => (input: A) => R): ((input: A) => R) =>
    self((input) => fix(self)(input));
  return fix(f);
}

/**
 * Evaluate one application of the Ω∞v operator against the current `Σ`.
 *
 * A verified delta is committed and the result is non-halting, which is what
 * `f(Σ ∪ Hash(x))` means: continue the loop with the larger memory. Every
 * other branch halts with one of the four verdicts and leaves `Σ` untouched.
 */
export function evaluateOmegaOperator(
  delta: OmegaDelta,
  state: OmegaFixpointState = createOmegaFixpointState(),
  options: { now?: () => string } = {},
): OmegaOperatorResult {
  const now = options.now ?? (() => new Date().toISOString());
  const evaluatedAt = now();
  const evidence = normaliseEvidence(delta.evidence);
  const authorityHeld = authority(delta.authority);
  const required = authority(delta.requiredAuthority);
  const deltaHash = omegaDeltaHash(delta);
  const consequence = delta.consequence?.trim() || 'unbounded change';
  const base = {
    deltaHash,
    expected: delta.expected,
    observed: delta.observed,
    evidence,
    consequence,
    evaluatedAt,
  };

  const verified =
    delta.knownScam !== true &&
    evidence.length > 0 &&
    authorityHeld >= required &&
    typeof delta.observed === 'string' &&
    delta.observed === delta.expected;

  // 1 — O(E(x)) ≡ VERIFIED → f(Σ ∪ Hash(x))
  if (verified) {
    const existing = state.entries.find((entry) => entry.deltaHash === deltaHash);
    if (existing) {
      // Hash(x) ∈ Σ already: the growth operator stopped moving. This is the
      // fixed point, not a new memory.
      return { ...base, verdict: 'VERIFIED', halted: true, haltReason: 'FIXED_POINT', committed: false, state };
    }
    const entry: OmegaMemoryEntry = {
      sequence: state.size + 1,
      deltaHash,
      expected: delta.expected,
      observed: delta.observed as string,
      evidence,
      consequence,
      previousRoot: state.root,
      root: commitRoot(state.root, deltaHash, state.size + 1, evaluatedAt),
      committedAt: evaluatedAt,
    };
    return {
      ...base,
      verdict: 'VERIFIED',
      halted: false,
      committed: true,
      state: { root: entry.root, size: state.size + 1, entries: [...state.entries, entry] },
    };
  }

  // 2 — K(x) ∈ SCAM
  if (delta.knownScam === true) {
    return { ...base, verdict: 'DIVERGENT', halted: true, haltReason: 'KNOWN_SCAM', committed: false, state };
  }

  // 3 — Evidence(x) = ∅
  if (evidence.length === 0) {
    return { ...base, verdict: 'UNKNOWN', halted: true, haltReason: 'EMPTY_EVIDENCE', committed: false, state };
  }

  // 4 — Authority(x) < Required
  if (authorityHeld < required) {
    return { ...base, verdict: 'NOT_EXECUTED', halted: true, haltReason: 'INSUFFICIENT_AUTHORITY', committed: false, state };
  }

  // Executed, evidenced, authorized — but Expected ≠ Observed.
  return { ...base, verdict: 'DIVERGENT', halted: true, haltReason: 'OBSERVATION_MISMATCH', committed: false, state };
}

const emptyVerdicts = (): Record<OmegaVerdict, number> => ({
  VERIFIED: 0,
  DIVERGENT: 0,
  UNKNOWN: 0,
  NOT_EXECUTED: 0,
});

/**
 * Run the loop: apply the operator to successive deltas until it halts or the
 * delta stream is exhausted (the fixed point). `Σ` only ever grows.
 */
export function iterateOmegaFixpoint(
  nextDelta: () => OmegaDelta | undefined,
  options: OmegaFixpointOptions = {},
): OmegaFixpointRun {
  const now = options.now ?? (() => new Date().toISOString());
  const maxSteps = Math.min(Math.max(Math.trunc(options.maxSteps ?? 64), 1), 1024);
  let state = options.state ?? createOmegaFixpointState();
  const steps: OmegaOperatorResult[] = [];

  const run = omegaY<number, { halted: boolean; haltReason: OmegaHaltReason }>((self) => (depth) => {
    if (depth >= maxSteps) {
      return { halted: true, haltReason: 'DEPTH_EXHAUSTED' as OmegaHaltReason };
    }
    const delta = nextDelta();
    if (!delta) {
      return { halted: true, haltReason: 'FIXED_POINT' as OmegaHaltReason };
    }
    const result = evaluateOmegaOperator(delta, state, { now });
    state = result.state;
    steps.push(result);
    if (result.halted) {
      return { halted: true, haltReason: result.haltReason ?? 'OBSERVATION_MISMATCH' };
    }
    return self(depth + 1);
  });

  const terminal = run(0);
  const verdicts = emptyVerdicts();
  for (const step of steps) verdicts[step.verdict] += 1;

  return { state, steps, halted: terminal.halted, haltReason: terminal.haltReason, verdicts };
}
