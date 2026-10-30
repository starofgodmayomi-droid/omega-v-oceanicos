/**
 * Executable form of ECOSYSTEM_BODY.md.
 *
 * A delta may be admitted to memory only when it is not classified as a scam,
 * evidence is present, authority meets the required gate, the caller is
 * allowed to remember, and expected reality equals observed reality.
 * This function never writes memory. Admission is not a write.
 */
import { createHash } from 'node:crypto';

export const ECOSYSTEM_FIXPOINT_EQUATION =
  'Y(lambda f. M[t+1] = M[t] union Hash(Delta) | Expected === Observed)';

export type EcosystemFixpointStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface EcosystemFixpointInput {
  readonly expected: string | null;
  readonly observed: string | null;
  readonly evidence: readonly string[];
  readonly authority: number;
  readonly requiredAuthority: number;
  readonly classifiedScam: boolean;
  readonly mayRemember: boolean;
}

export interface EcosystemFixpoint {
  readonly equation: typeof ECOSYSTEM_FIXPOINT_EQUATION;
  readonly roundTrip: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
  readonly admission: 'ADMIT' | 'HALT';
  readonly status: EcosystemFixpointStatus;
  readonly written: false;
  readonly digest: string | null;
  readonly reason: string;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function present(value: string | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function evaluateEcosystemFixpoint(input: EcosystemFixpointInput): EcosystemFixpoint {
  const halt = (
    status: EcosystemFixpointStatus,
    roundTrip: EcosystemFixpoint['roundTrip'],
    reason: string,
    digest: string | null = null,
  ): EcosystemFixpoint => ({
    equation: ECOSYSTEM_FIXPOINT_EQUATION,
    roundTrip,
    admission: 'HALT',
    status,
    written: false,
    digest,
    reason,
  });

  if (!input || typeof input !== 'object') {
    return halt('UNKNOWN', 'UNKNOWN', 'the fixpoint input is missing');
  }
  if (input.classifiedScam === true) {
    return halt('DIVERGENT', 'DIVERGENT', 'a classified scam halts before memory');
  }

  const evidence = Array.isArray(input.evidence)
    ? input.evidence.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : [];
  if (evidence.length === 0) {
    return halt('UNKNOWN', 'UNKNOWN', 'empty evidence stays UNKNOWN');
  }

  const expected = present(input.expected);
  const observed = present(input.observed);
  if (!expected || !observed || expected !== observed) {
    return halt('DIVERGENT', 'DIVERGENT', 'expected reality and observed reality do not match');
  }

  const digest = createHash('sha256').update(expected).digest('hex');
  if (!finiteNonNegative(input.authority) || !finiteNonNegative(input.requiredAuthority) || input.authority < input.requiredAuthority) {
    return halt('NOT_EXECUTED', 'VERIFIED', 'authority is below the required gate, so nothing is appended', digest);
  }
  if (input.mayRemember !== true) {
    return halt('NOT_EXECUTED', 'VERIFIED', 'the round trip matches, and this step is not allowed to append memory', digest);
  }

  return {
    equation: ECOSYSTEM_FIXPOINT_EQUATION,
    roundTrip: 'VERIFIED',
    admission: 'ADMIT',
    status: 'VERIFIED',
    written: false,
    digest,
    reason: 'expected matches observed; a later writer may append the digest; this function did not write',
  };
}
