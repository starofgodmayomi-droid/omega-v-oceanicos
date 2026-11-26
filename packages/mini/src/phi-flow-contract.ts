/**
 * Φ-flow contract — the four laws every adapter must preserve.
 *
 * Φ: Svc(E) → Intel. An adapter compresses a service observation into one
 * shared phi object. Adapters are never merged into the core; only this
 * contract is shared.
 *
 *   F1 formless       — the intent, independent of the adapter's form
 *   F2 flow           — the ordered transitions, preserved as steps
 *   F3 reflect        — the observation's own self-check, if one was made
 *   F4 incompressible — a digest of the whole observation (the water)
 *
 * Compress the vessel. Never the water.
 *
 * Evidence boundary. A record built from this contract is OBSERVED: it says
 * an adapter mapped an input. It is not VERIFIED. The digest in F4 proves
 * exact-byte identity against the input it was computed from; it does not
 * prove truth, permission, execution, or any real-world outcome.
 */
import { createHash } from 'node:crypto';

export const PHI_LAWS = Object.freeze(['F1', 'F2', 'F3', 'F4'] as const);
export type PhiLaw = (typeof PHI_LAWS)[number];

/** An adapter may only report OBSERVED. VERIFIED is not an adapter claim. */
export const PHI_STATUSES = Object.freeze(['OBSERVED'] as const);
export type PhiStatus = (typeof PHI_STATUSES)[number];

export interface PhiFlow {
  /** F1 formless: the intent, stripped of adapter-specific form. */
  readonly F1: string;
  /** F2 flow: ordered transitions. Order is meaning and is never sorted. */
  readonly F2: readonly string[];
  /** F3 reflect: observed self-checks. An empty list is honest, not missing. */
  readonly F3: readonly string[];
  /** F4 incompressible: SHA-256 of the whole observation this phi came from. */
  readonly F4: string;
}

export interface PhiFlowRecord {
  readonly adapter: string;
  readonly status: PhiStatus;
  readonly observedAt: string;
  /** ONE phi object. Never spread into sibling keys. */
  readonly phi: PhiFlow;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Name every law that is absent or unusable. An empty result means all four
 * laws are present; it does not mean the record is true.
 */
export function missingPhiLaws(value: unknown): PhiLaw[] {
  const record = asRecord(value);
  if (!record) return [...PHI_LAWS];

  const missing: PhiLaw[] = [];
  if (typeof record.F1 !== 'string' || record.F1.trim().length === 0) missing.push('F1');
  if (!isStringArray(record.F2) || record.F2.length === 0) missing.push('F2');
  if (!isStringArray(record.F3)) missing.push('F3');
  if (typeof record.F4 !== 'string' || !SHA256_HEX.test(record.F4)) missing.push('F4');
  return missing;
}

/** Adapter-specific keys belong outside phi; phi is exactly F1–F4. */
export function unexpectedPhiKeys(value: unknown): string[] {
  const record = asRecord(value);
  if (!record) return [];
  const allowed = new Set<string>(PHI_LAWS);
  return Object.keys(record).filter((key) => !allowed.has(key));
}

export class PhiFlowContractError extends Error {
  constructor(
    public readonly missing: readonly PhiLaw[],
    public readonly unexpected: readonly string[] = []
  ) {
    super(
      `Phi-flow contract violated: missing [${missing.join(', ') || 'none'}], ` +
        `unexpected [${unexpected.join(', ') || 'none'}]`
    );
    this.name = 'PhiFlowContractError';
  }
}

export function isPhiFlow(value: unknown): value is PhiFlow {
  return missingPhiLaws(value).length === 0 && unexpectedPhiKeys(value).length === 0;
}

/**
 * Permanent guard against the Δ12 collapse (four spreads into one key, only
 * F4 surviving). Throws unless exactly F1–F4 are present and usable.
 */
export function assertPhiFlow(value: unknown): asserts value is PhiFlow {
  const missing = missingPhiLaws(value);
  const unexpected = unexpectedPhiKeys(value);
  if (missing.length > 0 || unexpected.length > 0) {
    throw new PhiFlowContractError(missing, unexpected);
  }
}

/** SHA-256 over a canonical JSON rendering of the observation. */
export function hashPhiObservation(observation: unknown): string {
  return createHash('sha256').update(JSON.stringify(observation)).digest('hex');
}
