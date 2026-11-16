import { createHash } from 'node:crypto';

/**
 * Total matrix of one finite flow step.
 *
 * work × authority × evidence × claim is 24 cells. Each cell has one
 * pre-status. Only a local read or a local composition, with authority
 * met, evidence present, and an ordinary claim, can reach comparison.
 * External work halts NOT_EXECUTED. A caller who repeats the expected
 * sentence is not an independent witness. This function never writes a
 * ledger and never contacts an engine, a market, or a deployment.
 */

export const FLOW_MATRIX_ID = 'omega.flow.matrix.v1';
export const FLOW_MATRIX_CELLS = 24;
export const MAX_FLOW_INTENT = 2000;
export const MAX_FLOW_EXPECTED = 2000;
export const MAX_FLOW_MEMORY = 64;

export const FLOW_READ_ACTUAL = 'Local reading only. No external call. No spend. No deployment.';
export const FLOW_COMPOSE_ACTUAL = 'Local composition only. No external call. No spend. No deployment.';

export const FLOW_WORKS = ['read', 'compose', 'external'] as const;
export const FLOW_AUTHORITIES = ['below', 'met'] as const;
export const FLOW_EVIDENCE = ['empty', 'present'] as const;
export const FLOW_CLAIMS = ['ordinary', 'scam'] as const;

export type FlowWork = (typeof FLOW_WORKS)[number];
export type FlowAuthority = (typeof FLOW_AUTHORITIES)[number];
export type FlowEvidence = (typeof FLOW_EVIDENCE)[number];
export type FlowClaim = (typeof FLOW_CLAIMS)[number];
export type FlowStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
export type FlowReason =
  | 'SCAM'
  | 'AUTHORITY'
  | 'VENUE'
  | 'EMPTY_EVIDENCE'
  | 'EXPECTED_NOT_OBSERVED'
  | 'CALLER_MATCH'
  | 'WITNESS'
  | 'VERIFIED_APPEND'
  | 'INVALID_INPUT';

export interface FlowCell {
  readonly work: FlowWork;
  readonly authority: FlowAuthority;
  readonly evidence: FlowEvidence;
  readonly claim: FlowClaim;
}

export interface FlowPreStatus {
  readonly cell: FlowCell;
  readonly open: boolean;
  readonly status: FlowStatus | null;
  readonly reason: FlowReason | null;
  readonly executed: false;
}

export interface FlowStep {
  readonly equation: typeof FLOW_MATRIX_ID;
  readonly status: FlowStatus;
  readonly halt: boolean;
  readonly executed: boolean;
  readonly remembered: boolean;
  readonly appended: boolean;
  readonly ledgerMutation: false;
  readonly upgradeExecution: 'NOT_EXECUTED';
  readonly memory: readonly string[];
  readonly deltaHash: string | null;
  readonly actual: string | null;
  readonly reason: FlowReason;
  readonly cell: FlowCell;
}

export interface FlowInput {
  readonly cell: FlowCell;
  readonly intent: string;
  readonly expected: string;
  readonly witness: string | null;
  readonly memory: readonly string[];
}

const SHA256 = /^[a-f0-9]{64}$/;

export function hashFlowText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function enumerateFlowCells(): FlowCell[] {
  const cells: FlowCell[] = [];
  for (const work of FLOW_WORKS) {
    for (const authority of FLOW_AUTHORITIES) {
      for (const evidence of FLOW_EVIDENCE) {
        for (const claim of FLOW_CLAIMS) cells.push({ work, authority, evidence, claim });
      }
    }
  }
  return cells;
}

/** Halt order before any comparison. An open cell is not yet verified. */
export function classifyFlowCell(cell: FlowCell): FlowPreStatus {
  const base = { cell, executed: false as const };
  if (cell.claim === 'scam') {
    return { ...base, open: false, status: 'DIVERGENT', reason: 'SCAM' };
  }
  if (cell.authority === 'below') {
    return { ...base, open: false, status: 'NOT_EXECUTED', reason: 'AUTHORITY' };
  }
  if (cell.work === 'external') {
    return { ...base, open: false, status: 'NOT_EXECUTED', reason: 'VENUE' };
  }
  if (cell.evidence === 'empty') {
    return { ...base, open: false, status: 'UNKNOWN', reason: 'EMPTY_EVIDENCE' };
  }
  return { ...base, open: true, status: null, reason: null };
}

export function compressFlowMatrix(): {
  readonly equation: typeof FLOW_MATRIX_ID;
  readonly cells: typeof FLOW_MATRIX_CELLS;
  readonly open: number;
  readonly divergent: number;
  readonly unknown: number;
  readonly notExecuted: number;
  readonly verifiedBeforeWitness: 0;
} {
  const rows = enumerateFlowCells().map(classifyFlowCell);
  return {
    equation: FLOW_MATRIX_ID,
    cells: FLOW_MATRIX_CELLS,
    open: rows.filter((row) => row.open).length,
    divergent: rows.filter((row) => row.status === 'DIVERGENT').length,
    unknown: rows.filter((row) => row.status === 'UNKNOWN').length,
    notExecuted: rows.filter((row) => row.status === 'NOT_EXECUTED').length,
    verifiedBeforeWitness: 0,
  };
}

function localActual(work: FlowWork): string | null {
  if (work === 'read') return FLOW_READ_ACTUAL;
  if (work === 'compose') return FLOW_COMPOSE_ACTUAL;
  return null;
}

function cellShape(cell: FlowCell | undefined): boolean {
  return (
    !!cell &&
    (FLOW_WORKS as readonly string[]).includes(cell.work) &&
    (FLOW_AUTHORITIES as readonly string[]).includes(cell.authority) &&
    (FLOW_EVIDENCE as readonly string[]).includes(cell.evidence) &&
    (FLOW_CLAIMS as readonly string[]).includes(cell.claim)
  );
}

function halted(
  cell: FlowCell,
  status: FlowStatus,
  reason: FlowReason,
  memory: readonly string[],
  actual: string | null
): FlowStep {
  return {
    equation: FLOW_MATRIX_ID,
    status,
    halt: true,
    executed: false,
    remembered: false,
    appended: false,
    ledgerMutation: false,
    upgradeExecution: 'NOT_EXECUTED',
    memory: Object.freeze([...memory]),
    deltaHash: null,
    actual,
    reason,
    cell,
  };
}

/**
 * One cell, one step. External work is not performed. A matching expected
 * sentence from the caller stays UNKNOWN until `witness` is the SHA-256 of
 * the actual sentence this function produced.
 */
export function stepFlow(input: FlowInput): FlowStep {
  const memory = Array.isArray(input.memory) ? input.memory : [];
  const intent = typeof input.intent === 'string' ? input.intent.trim() : '';
  const expected = typeof input.expected === 'string' ? input.expected.trim() : '';
  const placeholder: FlowCell = { work: 'read', authority: 'below', evidence: 'empty', claim: 'ordinary' };
  const shapeInvalid =
    !cellShape(input.cell) ||
    intent.length === 0 ||
    intent.length > MAX_FLOW_INTENT ||
    expected.length > MAX_FLOW_EXPECTED ||
    memory.length > MAX_FLOW_MEMORY ||
    memory.some((entry) => typeof entry !== 'string' || !SHA256.test(entry)) ||
    (input.witness !== null && (typeof input.witness !== 'string' || !SHA256.test(input.witness)));

  if (shapeInvalid) return halted(cellShape(input.cell) ? input.cell : placeholder, 'UNKNOWN', 'INVALID_INPUT', [], null);

  const cell = input.cell;
  const pre = classifyFlowCell(cell);
  if (!pre.open && pre.status && pre.reason) return halted(cell, pre.status, pre.reason, memory, null);

  const actual = localActual(cell.work);
  if (!actual) return halted(cell, 'NOT_EXECUTED', 'VENUE', memory, null);
  if (expected !== actual) return halted(cell, 'DIVERGENT', 'EXPECTED_NOT_OBSERVED', memory, actual);
  if (input.witness === null) return halted(cell, 'UNKNOWN', 'CALLER_MATCH', memory, actual);
  if (input.witness !== hashFlowText(actual)) return halted(cell, 'DIVERGENT', 'WITNESS', memory, actual);

  const deltaHash = hashFlowText(`${cell.work}\n${cell.authority}\n${cell.evidence}\n${cell.claim}\n${intent}\n${actual}`);
  const appended = !memory.includes(deltaHash);
  return {
    equation: FLOW_MATRIX_ID,
    status: 'VERIFIED',
    halt: false,
    executed: true,
    remembered: true,
    appended,
    ledgerMutation: false,
    upgradeExecution: 'NOT_EXECUTED',
    memory: Object.freeze(appended ? [...memory, deltaHash] : [...memory]),
    deltaHash,
    actual,
    reason: 'VERIFIED_APPEND',
    cell,
  };
}
