import { createHash } from 'node:crypto';

/**
 * Fail-closed reading of ECOSYSTEM_BODY.md.
 *
 * Halt cases are decided before any memory append. A caller-supplied
 * "verified" flag does not override scam, empty evidence, or missing
 * authority. Y is one finite next step, not an unbounded loop and not a
 * missing external base. This function never writes a ledger.
 */

export const FIXPOINT_EQUATION_ID = 'omega.ecosystem-body.fixpoint.v1';
export const MAX_FIXPOINT_MEMORY = 64;
export const MAX_FIXPOINT_DELTA_CHARS = 4096;

export type FixpointStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export type FixpointReason =
  | 'VERIFIED_APPEND'
  | 'SCAM'
  | 'EMPTY_EVIDENCE'
  | 'AUTHORITY'
  | 'EXPECTED_NOT_OBSERVED'
  | 'INVALID_INPUT';

export interface FixpointInput {
  readonly expectedObserved: boolean;
  readonly scam: boolean;
  readonly evidenceEmpty: boolean;
  readonly authority: number;
  readonly requiredAuthority: number;
  readonly memory: readonly string[];
  readonly delta: string;
}

export interface FixpointStep {
  readonly equation: typeof FIXPOINT_EQUATION_ID;
  readonly status: FixpointStatus;
  readonly halt: boolean;
  readonly remembered: boolean;
  readonly appended: boolean;
  readonly ledgerMutation: false;
  readonly memory: readonly string[];
  readonly deltaHash: string | null;
  readonly reason: FixpointReason;
}

const SHA256 = /^[a-f0-9]{64}$/;

function halted(
  status: FixpointStatus,
  reason: FixpointReason,
  memory: readonly string[],
  deltaHash: string | null,
): FixpointStep {
  return {
    equation: FIXPOINT_EQUATION_ID,
    status,
    halt: true,
    remembered: false,
    appended: false,
    ledgerMutation: false,
    memory: Object.freeze([...memory]),
    deltaHash,
    reason,
  };
}

export function hashFixpointDelta(delta: string): string {
  return createHash('sha256').update(delta, 'utf8').digest('hex');
}

export function evaluateEcosystemFixpoint(input: FixpointInput): FixpointStep {
  const memory = Array.isArray(input.memory) ? input.memory : [];
  const shapeInvalid =
    typeof input.expectedObserved !== 'boolean' ||
    typeof input.scam !== 'boolean' ||
    typeof input.evidenceEmpty !== 'boolean' ||
    typeof input.authority !== 'number' ||
    typeof input.requiredAuthority !== 'number' ||
    !Number.isFinite(input.authority) ||
    !Number.isFinite(input.requiredAuthority) ||
    input.authority < 0 ||
    input.requiredAuthority < 0 ||
    typeof input.delta !== 'string' ||
    input.delta.length === 0 ||
    input.delta.length > MAX_FIXPOINT_DELTA_CHARS ||
    memory.length > MAX_FIXPOINT_MEMORY ||
    memory.some((entry) => typeof entry !== 'string' || !SHA256.test(entry));

  if (shapeInvalid) return halted('UNKNOWN', 'INVALID_INPUT', [], null);
  if (input.scam) return halted('DIVERGENT', 'SCAM', memory, null);
  if (input.evidenceEmpty) return halted('UNKNOWN', 'EMPTY_EVIDENCE', memory, null);
  if (input.authority < input.requiredAuthority) return halted('NOT_EXECUTED', 'AUTHORITY', memory, null);
  if (!input.expectedObserved) return halted('DIVERGENT', 'EXPECTED_NOT_OBSERVED', memory, null);

  const deltaHash = hashFixpointDelta(input.delta);
  const appended = !memory.includes(deltaHash);
  const next = appended ? [...memory, deltaHash] : [...memory];
  return {
    equation: FIXPOINT_EQUATION_ID,
    status: 'VERIFIED',
    halt: false,
    remembered: true,
    appended,
    ledgerMutation: false,
    memory: Object.freeze(next),
    deltaHash,
    reason: 'VERIFIED_APPEND',
  };
}
