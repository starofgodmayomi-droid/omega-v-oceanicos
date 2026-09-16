import type { OmegaCommandIR } from '@oceanicos/types';
import { WorkerRegistry } from './registry.js';

export class PlanCompiler {
  private readonly registry: WorkerRegistry;

  constructor(registry: WorkerRegistry) {
    this.registry = registry;
  }

  public compileIR(
    intent: string,
    requestedWorkers: string[],
    context: Record<string, unknown> = {}
  ): OmegaCommandIR {
    const validCheck = this.registry.validateRequestedWorkers(requestedWorkers);
    if (!validCheck.valid) {
      throw new Error(`UNKNOWN_WORKERS_REQUESTED: ${validCheck.missing.join(', ')}`);
    }

    const workerPlan: OmegaCommandIR['workerPlan'] = [];
    let stepNumber = 1;

    for (const workerId of requestedWorkers) {
      const worker = this.registry.getWorker(workerId);
      if (!worker) continue;

      let action = 'analyze';
      if (worker.role === 'observer') action = 'inspect-and-normalize';
      else if (worker.role === 'researcher') action = 'analyze-repository-and-docs';
      else if (worker.role === 'planner') action = 'compose-bounded-execution-plan';
      else if (worker.role === 'security-reviewer') action = 'audit-contracts-and-credentials';
      else if (worker.role === 'governance-reviewer') action = 'verify-policy-and-dissent-integrity';
      else if (worker.role === 'github-inspector') action = 'inspect-github-repository-evidence';
      else if (worker.role === 'tester') action = 'run-allowlisted-build-or-test';

      workerPlan.push({
        step: stepNumber++,
        workerId: worker.id,
        action,
        readOnly: worker.classification === 'read-only',
      });
    }

    const hasTester = requestedWorkers.includes('worker-tester');
    const transitionTarget = hasTester ? 'local_build_test' : 'read_only_intent_record';
    const transitionAction = hasTester ? 'EXECUTE_ALLOWLISTED_TEST' : 'RECORD_STATE';

    return {
      irVersion: '1.0',
      intent,
      requestedWorkers: [...requestedWorkers],
      evidenceRefs: ['PRESENCE_INPUT', 'LOCAL_ENV_OBSERVER'],
      policyRefs: [
        'CHARTER:TRUTH_WEAVER',
        'ADMISSION:FAIL_CLOSED_AUTHORITY',
        'EVIDENCE:RADICAL_HONESTY',
      ],
      workerPlan,
      transitionSpec: {
        target: transitionTarget,
        action: transitionAction,
        rollbackSupported: !hasTester,
      },
      observationSpec: {
        observerType: hasTester ? 'build_test' : 'state_snapshot',
        target: transitionTarget,
      },
    };
  }
}
