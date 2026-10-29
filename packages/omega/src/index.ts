/**
 * OMEGA — the Judge of the Ω∞v body.
 *
 * Reconciles a declared expected value against a declared observed value by
 * canonical digest. It fails closed: a missing or unserializable value is
 * UNKNOWN, never VERIFIED. Digest equality is evidence about those two
 * declared values only — it never claims external reality.
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
