import type {
  OmegaEvidenceRef,
  OmegaIR,
  OmegaPolicyRef,
  OmegaWorkerPlan,
} from '@oceanicos/types';

export interface OmegaCompileInput {
  readonly intent: string;
  readonly subject: string;
  readonly stateBefore: string;
  readonly evidenceRefs: readonly OmegaEvidenceRef[];
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
