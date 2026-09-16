import { observeCandidateChange } from './change.js';
import type { OmegaChangeRecord, OmegaCommand, OmegaCommandIR, OmegaWorkerId } from '@oceanicos/types';
import { OMEGA_COMMAND_VERSION, OMEGA_IR_VERSION, validateOmegaCommandInput, workerRisk } from '@oceanicos/types';

export type OmegaWorkerDescriptor = {
  readonly id: OmegaWorkerId;
  readonly version: '1.0.0';
  readonly role: string;
  readonly risk: 'read-only' | 'local-mutating' | 'externally-consequential';
  readonly humanApprovalRequired: boolean;
  readonly enabled: true;
  readonly capabilities: readonly string[];
  readonly limitations: readonly string[];
};

const WORKERS: readonly OmegaWorkerDescriptor[] = [
  { id: 'observer', version: '1.0.0', role: 'normalize supplied observations', risk: 'read-only', humanApprovalRequired: false, enabled: true, capabilities: ['observe:supplied-state'], limitations: ['does not prove external reality'] },
  { id: 'researcher', version: '1.0.0', role: 'collect cited repository or document evidence', risk: 'read-only', humanApprovalRequired: false, enabled: true, capabilities: ['read:repository', 'read:documents'], limitations: ['does not authorize actions'] },
  { id: 'planner', version: '1.0.0', role: 'produce a bounded declarative plan', risk: 'read-only', humanApprovalRequired: false, enabled: true, capabilities: ['plan:declarative-ir'], limitations: ['IR contains no executable code'] },
  { id: 'tester', version: '1.0.0', role: 'run an allowlisted repository test or build', risk: 'local-mutating', humanApprovalRequired: true, enabled: true, capabilities: ['test:allowlisted'], limitations: ['no arbitrary shell or network mutation'] },
  { id: 'security-reviewer', version: '1.0.0', role: 'review proposed commands and diffs', risk: 'read-only', humanApprovalRequired: false, enabled: true, capabilities: ['review:security'], limitations: ['review is not authorization'] },
  { id: 'governance-reviewer', version: '1.0.0', role: 'preserve dissent and policy concerns', risk: 'read-only', humanApprovalRequired: false, enabled: true, capabilities: ['review:governance'], limitations: ['cannot approve its own proposal'] },
];

export function listOmegaWorkers(): readonly OmegaWorkerDescriptor[] {
  return WORKERS.map((worker) => ({ ...worker, capabilities: [...worker.capabilities], limitations: [...worker.limitations] }));
}

export function buildOmegaCommand(input: {
  intent: string;
  requestedBy: string;
  workers: OmegaWorkerId[];
  idempotencyKey: string;
  context?: Record<string, string>;
  sessionId?: string;
  now?: () => string;
}): OmegaCommand {
  validateOmegaCommandInput(input);
  const now = input.now ?? (() => new Date().toISOString());
  const createdAt = now();
  const commandId = `omega-${input.idempotencyKey}`;
  const change: OmegaChangeRecord = observeCandidateChange({
    subject: commandId,
    intent: input.intent,
    stateBefore: input.context?.stateBefore ?? 'unknown',
    context: input.context,
  });
  const ir: OmegaCommandIR = {
    version: OMEGA_IR_VERSION,
    intent: input.intent,
    evidenceRefs: [...change.evidence],
    policyRefs: [],
    workerPlan: [...input.workers],
    transition: { kind: input.workers.includes('tester') ? 'test' : 'report', target: 'local-oceanicos', arguments: {} },
    observation: { kind: input.context?.observationKind === 'api-health' ? 'api-health' : 'supplied-state' },
  };
  const requiresReview = input.workers.some((worker) => workerRisk(worker) !== 'read-only');
  return {
    version: OMEGA_COMMAND_VERSION,
    commandId,
    sessionId: input.sessionId ?? `session-${input.requestedBy}`,
    requestedBy: input.requestedBy,
    createdAt,
    intent: input.intent,
    context: { ...(input.context ?? {}) },
    workers: [...input.workers],
    ir,
    change: { ...change, decision: requiresReview ? 'REVIEW' : change.decision },
    idempotencyKey: input.idempotencyKey,
    dryRun: true,
    status: requiresReview ? 'REVIEW' : 'PROPOSED',
    dissent: [],
    limitations: [
      'AI and worker output is proposal evidence, not truth or authority',
      'external reality requires an independent observer',
      'arbitrary shell, credentials, remote mutation, and deployment are disabled',
    ],
    redacted: true,
  };
}
