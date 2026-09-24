import type {
  OmegaEvidenceRef,
  OmegaIR,
  OmegaPolicyRef,
  OmegaSourceRef,
  OmegaSourceState,
  OmegaWorkerPlan,
} from '@oceanicos/types';

export interface OmegaCompileInput {
  readonly intent: string;
  readonly subject: string;
  readonly stateBefore: string;
  readonly evidenceRefs: readonly OmegaEvidenceRef[];
  readonly sourceRefs?: readonly OmegaSourceRef[];
  readonly policyRefs: readonly OmegaPolicyRef[];
  readonly workerPlan: readonly OmegaWorkerPlan[];
  readonly transition: {
    readonly requestedStateAfter?: string;
    readonly consequence?: string;
    readonly dryRun: boolean;
  };
  readonly observation: {
    readonly observerId: string;
    readonly targets: readonly string[];
    readonly evidenceRequired: readonly string[];
  };
}

const normalize = (value: string, field: string): string => {
  const normalized = value.trim().replace(/\\s+/g, ' ');
  if (!normalized) {
    throw new Error(`Omega compiler requires a non-empty ${field}`);
  }
  return normalized;
};

const normalizeList = (values: readonly string[], field: string): readonly string[] =>
  values.map((value) => normalize(value, field));

const sourceStates: readonly OmegaSourceState[] = [
  'DISCOVERED',
  'RETRIEVED',
  'TRUSTED',
  'AUTHORIZED',
  'EXECUTED',
  'OBSERVED',
  'VERIFIED',
];

const normalizeSourceState = (state: OmegaSourceState): OmegaSourceState => {
  if (!sourceStates.includes(state)) throw new Error(`unsupported source state: ${String(state)}`);
  return state;
};

/**
 * Advance a source only forward through the epistemic lifecycle. A later
 * observation cannot erase a stronger prior state by silently regressing it.
 */
export function advanceOmegaSourceState(current: OmegaSourceState, next: OmegaSourceState): OmegaSourceState {
  const currentState = normalizeSourceState(current);
  const nextState = normalizeSourceState(next);
  if (sourceStates.indexOf(nextState) < sourceStates.indexOf(currentState)) {
    throw new Error(`source state cannot regress from ${currentState} to ${nextState}`);
  }
  return nextState;
}

/**
 * Normalize source metadata without promoting retrieval into trust or truth.
 * This is a data-only boundary: it performs no network access or authorization.
 */
export function normalizeOmegaSource(source: OmegaSourceRef): OmegaSourceRef {
  const normalized: OmegaSourceRef = {
    id: normalize(source.id, 'source id'),
    kind: normalize(source.kind, 'source kind'),
    locator: normalize(source.locator, 'source locator'),
    state: normalizeSourceState(source.state),
    provenance: normalize(source.provenance, 'source provenance'),
    ...(source.digest ? { digest: normalize(source.digest, 'source digest') } : {}),
    ...(source.authority ? { authority: normalize(source.authority, 'source authority') } : {}),
    ...(source.evidenceRef ? { evidenceRef: normalize(source.evidenceRef, 'source evidence reference') } : {}),
  };

  if (normalized.state === 'AUTHORIZED' && !normalized.authority) {
    throw new Error('authorized source requires explicit source authority');
  }
  if (normalized.state === 'VERIFIED' && !normalized.evidenceRef) {
    throw new Error('verified source requires an evidence reference');
  }
  return normalized;
}

/**
 * Compile bounded intent into declarative, non-executable Ω IR.
 *
 * Compilation performs no authorization, verification, I/O, or execution.
 * The returned IR is deterministic for identical input and contains no
 * generated timestamps, identifiers, executable code, or implicit authority.
 */
export function compileOmegaIntent(input: OmegaCompileInput): OmegaIR {
  const intent = normalize(input.intent, 'intent');
  const subject = normalize(input.subject, 'subject');
  const stateBefore = normalize(input.stateBefore, 'stateBefore');

  const evidenceRefs = input.evidenceRefs.map((ref) => ({
    id: normalize(ref.id, 'evidence reference id'),
    kind: normalize(ref.kind, 'evidence reference kind'),
    source: normalize(ref.source, 'evidence reference source'),
    ...(ref.digest ? { digest: normalize(ref.digest, 'evidence reference digest') } : {}),
  }));

  const sourceRefs = input.sourceRefs?.map(normalizeOmegaSource);

  const policyRefs = input.policyRefs.map((ref) => ({
    id: normalize(ref.id, 'policy reference id'),
    version: normalize(ref.version, 'policy reference version'),
    requirement: normalize(ref.requirement, 'policy requirement'),
  }));

  const workerPlan = input.workerPlan.map((worker) => ({
    workerId: normalize(worker.workerId, 'worker id'),
    version: normalize(worker.version, 'worker version'),
    capability: normalize(worker.capability, 'worker capability'),
    mode: worker.mode,
    approvalRequired: worker.approvalRequired,
  }));

  const observerId = normalize(input.observation.observerId, 'observer id');

  return {
    version: 'omega-ir.v1',
    intent,
    evidenceRefs,
    ...(sourceRefs ? { sourceRefs } : {}),
    policyRefs,
    workerPlan,
    transitionSpec: {
      subject,
      intent,
      stateBefore,
      ...(input.transition.requestedStateAfter
        ? { requestedStateAfter: normalize(input.transition.requestedStateAfter, 'requestedStateAfter') }
        : {}),
      ...(input.transition.consequence
        ? { consequence: normalize(input.transition.consequence, 'consequence') }
        : {}),
      dryRun: input.transition.dryRun,
    },
    observationSpec: {
      observerId,
      targets: normalizeList(input.observation.targets, 'observation target'),
      evidenceRequired: normalizeList(input.observation.evidenceRequired, 'required observation evidence'),
    },
  };
}
