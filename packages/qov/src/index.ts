import type { Attestation, IEvidence, IMiniBlock, IObservation } from '@oceanicos/types';

export type QovStage = 'observe' | 'verify' | 'remember' | 'attest' | 'evolve';

export interface QovProvenance {
  readonly observationId: string;
  readonly verificationId: string;
  readonly memoryId: string;
  readonly attestationId?: string;
  readonly sourceTimestamp: string;
  readonly ruleRoute: string;
  readonly source: 'oceanicos-mini';
}

export interface QovCycleRecord {
  readonly id: string;
  readonly identity: 'Qov';
  readonly stage: QovStage;
  readonly observed: IObservation;
  readonly evidence: IEvidence;
  readonly memory: {
    readonly index: number;
    readonly hash: string;
    readonly previousHash: string;
  };
  readonly attestation?: Pick<Attestation, 'id' | 'status' | 'verified' | 'attestedAt' | 'attestedBy'>;
  readonly provenance: QovProvenance;
  readonly uncertainty: 'verified-by-local-rule' | 'unattested' | 'attestation-present';
  readonly externalWrites: 'disabled';
}

export interface QovEvolutionProposal {
  readonly id: string;
  readonly type: 'evolution-proposal';
  readonly basedOn: QovProvenance;
  readonly proposedChange: string;
  readonly status: 'proposed' | 'approved' | 'rejected' | 'executed';
  readonly authorization: 'human-required';
  readonly sideEffects: 'none-until-approved';
}

export type QovCommandName = 'OBSERVE' | 'FOCUS' | 'EXPAND' | 'DIRECT' | 'TRANSCEND';

export interface QovCompiledPlan {
  readonly command: QovCommandName;
  readonly status: 'ready' | 'proposal-required' | 'blocked';
  readonly target?: string;
  readonly parameter?: string;
  readonly value?: string;
  readonly intent: string;
  readonly requiresHumanApproval: boolean;
  readonly sideEffects: 'none' | 'local-proposal-only';
  readonly provenance?: QovProvenance;
  readonly limitation?: string;
}

export function createQovCycleRecord(block: IMiniBlock, attestation?: Attestation): QovCycleRecord {
  const attestationView = attestation
    ? {
        id: attestation.id,
        status: attestation.status,
        verified: attestation.verified,
        attestedAt: attestation.attestedAt,
        attestedBy: attestation.attestedBy,
      }
    : undefined;

  return {
    id: `qov-cycle-${block.observation.uuid}-${block.index}`,
    identity: 'Qov',
    stage: attestation ? 'attest' : 'remember',
    observed: block.observation,
    evidence: block.evidence,
    memory: {
      index: block.index,
      hash: block.hash,
      previousHash: block.previousHash,
    },
    attestation: attestationView,
    provenance: {
      observationId: block.observation.uuid,
      verificationId: block.evidence.signatureProof,
      memoryId: block.hash,
      attestationId: attestation?.id,
      sourceTimestamp: block.observation.timestamp,
      ruleRoute: block.evidence.lawRoute,
      source: 'oceanicos-mini',
    },
    uncertainty: attestation ? 'attestation-present' : 'unattested',
    externalWrites: 'disabled',
  };
}

export function proposeQovEvolution(record: QovCycleRecord, proposedChange: string): QovEvolutionProposal {
  const change = proposedChange.trim();
  if (!change) throw new Error('proposedChange must be non-empty');
  if (change.length > 500) throw new Error('proposedChange must be 500 characters or fewer');

  return {
    id: `qov-evolution-${record.id}`,
    type: 'evolution-proposal',
    basedOn: record.provenance,
    proposedChange: change,
    status: 'proposed',
    authorization: 'human-required',
    sideEffects: 'none-until-approved',
  };
}

const SAFE_IDENTIFIER = /^[A-Za-z0-9._:-]{1,96}$/;
const MAX_COMMAND_LENGTH = 320;

export function compileQovCommand(input: string, provenance?: QovProvenance): QovCompiledPlan {
  const normalized = input.trim();
  if (!normalized) throw new Error('command must be non-empty');
  if (normalized.length > MAX_COMMAND_LENGTH) throw new Error(`command must be ${MAX_COMMAND_LENGTH} characters or fewer`);

  const parts = normalized.split(/\s+/);
  const command = parts[0]?.toUpperCase() as QovCommandName;
  if (!['OBSERVE', 'FOCUS', 'EXPAND', 'DIRECT', 'TRANSCEND'].includes(command)) {
    throw new Error(`unsupported Qov command: ${parts[0]}`);
  }
  if (command === 'TRANSCEND') {
    return {
      command,
      status: 'blocked',
      intent: 'No finite local runtime mapping exists for this concept.',
      requiresHumanApproval: true,
      sideEffects: 'none',
      limitation: 'TRANSCEND is conceptual and cannot be executed, simulated, or authorized by this compiler.',
    };
  }
  const target = parts[1];
  if (!target || !SAFE_IDENTIFIER.test(target)) throw new Error(`${command} requires one safe target identifier`);

  if (command === 'OBSERVE' || command === 'FOCUS') {
    if (parts.length !== 2) throw new Error(`${command} accepts exactly one target identifier`);
    return {
      command,
      status: 'ready',
      target,
      intent: command === 'OBSERVE' ? `Read the bounded local state for ${target}.` : `Focus the local workspace on ${target}.`,
      requiresHumanApproval: false,
      sideEffects: 'none',
      provenance,
    };
  }

  const parameter = parts[2];
  const value = parts[3];
  if (!parameter || !SAFE_IDENTIFIER.test(parameter) || !value || value.length > 160 || parts.length !== 4) {
    throw new Error(`${command} requires target, parameter, and one bounded value`);
  }
  return {
    command,
    status: 'proposal-required',
    target,
    parameter,
    value,
    intent: command === 'EXPAND' ? `Prepare a bounded expansion proposal for ${target}.${parameter}.` : `Prepare a bounded direct-change proposal for ${target}.${parameter}.`,
    requiresHumanApproval: true,
    sideEffects: 'local-proposal-only',
    provenance,
  };
}
