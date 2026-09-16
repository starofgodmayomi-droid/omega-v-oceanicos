import type { ChangeDecision, OmegaChangeRecord } from './index.js';

export const OMEGA_COMMAND_VERSION = 'omega.command.v1' as const;
export const OMEGA_IR_VERSION = 'omega.ir.v1' as const;
export const OMEGA_COMMAND_STATUSES = [
  'PROPOSED',
  'REVIEW',
  'DENIED',
  'AUTHORIZED',
  'EXECUTED',
  'ATTESTED',
  'VERIFIED',
  'DIVERGENT',
  'UNKNOWN',
  'FAILED',
] as const;
export type OmegaCommandStatus = (typeof OMEGA_COMMAND_STATUSES)[number];
export type OmegaWorkerRisk = 'read-only' | 'local-mutating' | 'externally-consequential';
export type OmegaWorkerId =
  | 'observer'
  | 'researcher'
  | 'planner'
  | 'tester'
  | 'security-reviewer'
  | 'governance-reviewer';

export type OmegaTransitionSpec = {
  readonly kind: 'observation' | 'test' | 'report';
  readonly target: string;
  readonly arguments: Record<string, string>;
};

export type OmegaCommandIR = {
  readonly version: typeof OMEGA_IR_VERSION;
  readonly intent: string;
  readonly evidenceRefs: readonly string[];
  readonly policyRefs: readonly string[];
  readonly workerPlan: readonly OmegaWorkerId[];
  readonly transition: OmegaTransitionSpec;
  readonly observation: { readonly kind: 'supplied-state' | 'execution-result' | 'api-health' };
};

export type OmegaDissent = {
  readonly workerId: string;
  readonly statement: string;
  readonly evidenceRefs: readonly string[];
};

export type OmegaCommand = {
  readonly version: typeof OMEGA_COMMAND_VERSION;
  readonly commandId: string;
  readonly sessionId: string;
  readonly requestedBy: string;
  readonly createdAt: string;
  readonly intent: string;
  readonly context: Record<string, string>;
  readonly workers: readonly OmegaWorkerId[];
  readonly ir: OmegaCommandIR;
  readonly change: OmegaChangeRecord;
  readonly idempotencyKey: string;
  readonly dryRun: boolean;
  readonly status: OmegaCommandStatus;
  readonly dissent: readonly OmegaDissent[];
  readonly limitations: readonly string[];
  readonly redacted: true;
};

export type OmegaRealityObservation = {
  readonly kind: 'supplied-state' | 'execution-result' | 'api-health';
  readonly observedState: string;
  readonly evidence: string;
  readonly observedAt: string;
};

export type OmegaCommandResult = {
  readonly command: OmegaCommand;
  readonly status: OmegaCommandStatus;
  readonly execution?: { readonly stateAfter: string; readonly consequence: string; readonly attestationId: string };
  readonly reality?: OmegaRealityObservation & { readonly classification: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' };
  readonly nextAction: string;
};

const MAX_INTENT = 2000;
const MAX_CONTEXT_ENTRIES = 16;
const MAX_WORKERS = 6;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const ALLOWED_WORKERS = new Set<OmegaWorkerId>([
  'observer', 'researcher', 'planner', 'tester', 'security-reviewer', 'governance-reviewer',
]);

export function validateOmegaCommandInput(input: {
  intent: unknown;
  requestedBy: unknown;
  workers: unknown;
  idempotencyKey: unknown;
  context?: unknown;
}): asserts input is { intent: string; requestedBy: string; workers: OmegaWorkerId[]; idempotencyKey: string; context?: Record<string, string> } {
  if (typeof input.intent !== 'string' || input.intent.trim().length < 1 || input.intent.length > MAX_INTENT)
    throw new Error('intent must be a non-empty string no longer than 2000 characters');
  if (typeof input.requestedBy !== 'string' || !ID.test(input.requestedBy))
    throw new Error('requestedBy must be a bounded identifier');
  if (!Array.isArray(input.workers) || input.workers.length < 1 || input.workers.length > MAX_WORKERS || input.workers.some((worker) => typeof worker !== 'string' || !ALLOWED_WORKERS.has(worker as OmegaWorkerId)))
    throw new Error('workers must contain only enabled bounded worker identifiers');
  if (typeof input.idempotencyKey !== 'string' || !ID.test(input.idempotencyKey))
    throw new Error('idempotencyKey must be a bounded identifier');
  if (input.context !== undefined) {
    if (!input.context || typeof input.context !== 'object' || Array.isArray(input.context) || Object.keys(input.context).length > MAX_CONTEXT_ENTRIES)
      throw new Error('context must be a bounded string map');
    if (Object.values(input.context).some((value) => typeof value !== 'string' || value.length > 512))
      throw new Error('context values must be strings no longer than 512 characters');
  }
}

export function isOmegaStatus(value: unknown): value is OmegaCommandStatus {
  return typeof value === 'string' && (OMEGA_COMMAND_STATUSES as readonly string[]).includes(value);
}

export function canTransitionOmegaStatus(from: OmegaCommandStatus, to: OmegaCommandStatus): boolean {
  const transitions: Record<OmegaCommandStatus, readonly OmegaCommandStatus[]> = {
    PROPOSED: ['REVIEW', 'DENIED', 'AUTHORIZED'],
    REVIEW: ['AUTHORIZED', 'DENIED'],
    DENIED: [],
    AUTHORIZED: ['EXECUTED', 'FAILED'],
    EXECUTED: ['ATTESTED', 'FAILED', 'UNKNOWN'],
    ATTESTED: ['VERIFIED', 'DIVERGENT', 'UNKNOWN'],
    VERIFIED: [],
    DIVERGENT: [],
    UNKNOWN: ['VERIFIED', 'DIVERGENT'],
    FAILED: [],
  };
  return transitions[from].includes(to);
}

export function workerRisk(worker: OmegaWorkerId): OmegaWorkerRisk {
  return worker === 'tester' ? 'local-mutating' : 'read-only';
}

export function decisionToStatus(decision: ChangeDecision): OmegaCommandStatus {
  if (decision === 'ALLOW') return 'AUTHORIZED';
  if (decision === 'DENY') return 'DENIED';
  return 'REVIEW';
}
