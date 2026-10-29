/**
 * OMEGA — the Judge of the Ω∞v body.
 *
 * It compares what was expected with what was actually observed and returns one of four
 * verdicts. It fails closed: anything it cannot compare is `UNKNOWN`, and only an exact
 * match with a named observation source is `VERIFIED`.
 *
 * ```text
 * no observation            → UNKNOWN
 * observation, no source    → UNKNOWN   (a caller echo carries no provenance)
 * different values          → DIVERGENT (differences are named)
 * equal values + source     → VERIFIED  (bounded to this comparison)
 * ```
 *
 * A `VERIFIED` here is a verdict about one comparison, not a claim that reality agrees.
 */

export type OmegaVerdict = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface OmegaObservation {
  /** What was observed. Compared value-for-value against the expectation. */
  value: unknown;
  /** Where it came from. Empty means the observation cannot carry provenance. */
  source: string;
  observedAt?: string;
}

export interface OmegaReconciliation {
  readonly verdict: OmegaVerdict;
  readonly expected: unknown;
  readonly observed: OmegaObservation | null;
  readonly differences: readonly string[];
  readonly reasons: readonly string[];
  /** True only for VERIFIED. Every other verdict refuses the next step. */
  readonly allow: boolean;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stable = (value: unknown): string => {
  if (!isPlainObject(value)) return JSON.stringify(value) ?? 'undefined';
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${key}:${stable(value[key])}`);
  return `{${entries.join(',')}}`;
};

const differencesBetween = (expected: unknown, observed: unknown): string[] => {
  if (isPlainObject(expected) && isPlainObject(observed)) {
    const keys = Array.from(new Set([...Object.keys(expected), ...Object.keys(observed)])).sort();
    return keys.filter((key) => stable(expected[key]) !== stable(observed[key]));
  }
  return stable(expected) === stable(observed) ? [] : ['value'];
};

/** Reconcile one expectation against one observation. Fails closed. */
export function reconcile(
  expected: unknown,
  observed: OmegaObservation | null | undefined
): OmegaReconciliation {
  if (observed === null || observed === undefined) {
    return {
      verdict: 'UNKNOWN',
      expected,
      observed: null,
      differences: [],
      reasons: ['no observation was supplied, so nothing could be reconciled'],
      allow: false,
    };
  }

  if (typeof observed.source !== 'string' || observed.source.trim().length === 0) {
    return {
      verdict: 'UNKNOWN',
      expected,
      observed,
      differences: [],
      reasons: ['observation carries no source, so it cannot establish provenance'],
      allow: false,
    };
  }

  const differences = differencesBetween(expected, observed.value);
  if (differences.length > 0) {
    return {
      verdict: 'DIVERGENT',
      expected,
      observed,
      differences,
      reasons: [
        `observed value differs from the expectation in: ${differences.join(', ')}`,
        `observed by ${observed.source}`,
      ],
      allow: false,
    };
  }

  return {
    verdict: 'VERIFIED',
    expected,
    observed,
    differences: [],
    reasons: [
      `expected and observed match, observed by ${observed.source}`,
      'verification is bounded to this comparison',
    ],
    allow: true,
  };
}

/** The gate: only VERIFIED opens it. */
export const omegaGate = (verdict: OmegaVerdict): boolean => verdict === 'VERIFIED';
