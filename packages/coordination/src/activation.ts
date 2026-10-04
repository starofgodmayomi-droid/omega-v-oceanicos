import { ExecutionTask, ExecutionSummary, ParallelExecutor, ParallelExecutorOptions } from './index.js';

export type ActivationAuthorization = {
  approved: boolean;
  operatorId: string;
  reason: string;
};

export type WorkerBuilderActivationRequest = {
  authorization: ActivationAuthorization;
  tasks: ExecutionTask[];
  executor?: ParallelExecutorOptions;
};

export type ActivationAdmission = {
  decision: 'ALLOW' | 'DENY' | 'REVIEW';
  authorized: boolean;
  /** Evidence from the existing ΩIR → registry admission bridge. */
  registryMatched: boolean;
  policyReferencesSatisfied: boolean;
  evidenceRequirementsSatisfied: boolean;
  approvalRequirementSatisfied: boolean;
};

export type OmegaAdmissionBridgeResultLike = {
  change: { decision: 'ALLOW' | 'DENY' | 'REVIEW'; authorized: boolean };
  registryMatched: boolean;
  policyReferencesSatisfied: boolean;
  evidenceRequirementsSatisfied: boolean;
  approvalRequirementSatisfied: boolean;
};

export type AdmittedWorkerBuilderActivationRequest = WorkerBuilderActivationRequest & {
  admission: ActivationAdmission;
};

export type ActivationRealityStatus = 'UNKNOWN' | 'NOT_EXECUTED';

export type WorkerBuilderActivationEvidence = {
  readonly kind: 'worker-builder-activation-evidence';
  readonly runId: string;
  readonly executionState: ExecutionSummary['state'];
  readonly executed: boolean;
  readonly realityStatus: ActivationRealityStatus;
  readonly eventCount: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly limitations: readonly string[];
};

export type WorkerBuilderActivationResult = {
  kind: 'worker-builder-activation';
  authorized: true;
  operatorId: string;
  reason: string;
  roles: Array<'worker' | 'builder'>;
  execution: ExecutionSummary;
  limitations: readonly string[];
};

const MAX_AUTH_TEXT = 128;
/**
 * Convert bounded executor output into an explicit evidence boundary.
 * Successful local task execution is evidence of execution only; it is not
 * evidence that the intended external reality was achieved.
 */
export const activationEvidenceFromExecution = (
  execution: ExecutionSummary,
): WorkerBuilderActivationEvidence => ({
  kind: 'worker-builder-activation-evidence',
  runId: execution.runId,
  executionState: execution.state,
  executed: execution.started > 0 && execution.succeeded + execution.failed === execution.started,
  realityStatus: execution.started === 0 ? 'NOT_EXECUTED' : 'UNKNOWN',
  eventCount: execution.events.length,
  succeeded: execution.succeeded,
  failed: execution.failed,
  limitations: [
    ...execution.limitations,
    'local task completion does not prove external reality',
    'external reality remains UNKNOWN until an independent observation is supplied',
  ],
});



const requireAdmission = (admission: ActivationAdmission): void => {
  if (
    admission.decision !== 'ALLOW' ||
    admission.authorized !== true ||
    admission.registryMatched !== true ||
    admission.policyReferencesSatisfied !== true ||
    admission.evidenceRequirementsSatisfied !== true ||
    admission.approvalRequirementSatisfied !== true
  ) {
    throw new Error('worker/builder activation requires an ALLOW admission with authorization and satisfied registry/policy/evidence/approval requirements');
  }
};

const requireText = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > MAX_AUTH_TEXT) {
    throw new Error(`${field} must be a non-empty string of at most ${MAX_AUTH_TEXT} characters`);
  }
  return value.trim();
};

/**
 * Explicit human-gated activation bridge for finite worker/builder work.
 *
 * This activates only supplied tasks through the existing bounded local
 * executor. It does not create authority, discover credentials, execute
 * arbitrary shell commands, or claim distributed coordination.
 */
export async function activateWorkersAndBuilders(
  request: WorkerBuilderActivationRequest,
): Promise<WorkerBuilderActivationResult> {
  if (request.authorization?.approved !== true) {
    throw new Error('worker/builder activation requires explicit human approval');
  }

  const operatorId = requireText(request.authorization.operatorId, 'operatorId');
  const reason = requireText(request.authorization.reason, 'authorization reason');

  if (!Array.isArray(request.tasks) || request.tasks.length === 0) {
    throw new Error('at least one worker or builder task is required');
  }

  const roles = [...new Set(request.tasks.map((task) => task.role))];
  const executor = new ParallelExecutor(request.executor);
  const execution = await executor.execute(request.tasks);

  return {
    kind: 'worker-builder-activation',
    authorized: true,
    operatorId,
    reason,
    roles,
    execution,
    limitations: [
      'explicit human approval is required for every activation request',
      'local process only',
      'bounded task count and concurrency only',
      'does not provide credentials or arbitrary shell/network authority',
      'does not prove distributed coordination or deployment health',
    ],
  };
}


/**
 * Convert the existing ΩIR admission-bridge result into the activation gate.
 * This is an adapter only: it neither re-evaluates nor grants admission.
 */
export const activationAdmissionFromOmegaBridge = (
  result: OmegaAdmissionBridgeResultLike,
): ActivationAdmission => ({
  decision: result.change.decision,
  authorized: result.change.authorized,
  registryMatched: result.registryMatched,
  policyReferencesSatisfied: result.policyReferencesSatisfied,
  evidenceRequirementsSatisfied: result.evidenceRequirementsSatisfied,
  approvalRequirementSatisfied: result.approvalRequirementSatisfied,
});

/**
 * Activation entry point for callers that already passed the Ω∞v admission gate.
 * The admission proof is consumed here; this function never creates or upgrades it.
 */
export async function activateAdmittedWorkersAndBuilders(
  request: AdmittedWorkerBuilderActivationRequest,
): Promise<WorkerBuilderActivationResult> {
  requireAdmission(request.admission);
  return activateWorkersAndBuilders(request);
}
