import { ExecutionTask, ExecutionSummary, ParallelExecutor, ParallelExecutorOptions } from './index';

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
};

export type AdmittedWorkerBuilderActivationRequest = WorkerBuilderActivationRequest & {
  admission: ActivationAdmission;
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

const requireAdmission = (admission: ActivationAdmission): void => {
  if (admission.decision !== 'ALLOW' || admission.authorized !== true) {
    throw new Error('worker/builder activation requires an ALLOW admission with authorization');
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
 * Activation entry point for callers that already passed the Ω∞v admission gate.
 * The admission proof is consumed here; this function never creates or upgrades it.
 */
export async function activateAdmittedWorkersAndBuilders(
  request: AdmittedWorkerBuilderActivationRequest,
): Promise<WorkerBuilderActivationResult> {
  requireAdmission(request.admission);
  return activateWorkersAndBuilders(request);
}
