import type { OmegaWorkerDefinition } from '@oceanicos/types';

export const INITIAL_ENABLED_WORKERS: OmegaWorkerDefinition[] = [
  {
    id: 'worker-observer',
    version: '1.0.0',
    role: 'observer',
    classification: 'read-only',
    description: 'Read-only observer normalizing supplied human intent, environment inputs, and system telemetry.',
    capabilities: ['normalize-input', 'inspect-telemetry', 'read-state'],
    requiresApproval: false,
    timeoutMs: 5000,
    maxOutputBytes: 32768,
    maxRetries: 1,
  },
  {
    id: 'worker-researcher',
    version: '1.0.0',
    role: 'researcher',
    classification: 'read-only',
    description: 'Read-only repository and documentation analysis engine with grounded citations.',
    capabilities: ['repo-analysis', 'cite-evidence', 'read-docs'],
    requiresApproval: false,
    timeoutMs: 10000,
    maxOutputBytes: 65536,
    maxRetries: 1,
  },
  {
    id: 'worker-planner',
    version: '1.0.0',
    role: 'planner',
    classification: 'read-only',
    description: 'Produces bounded, inspectable command plans and declarative IR specifications without executing.',
    capabilities: ['bounded-plan', 'compose-ir', 'dry-run-spec'],
    requiresApproval: false,
    timeoutMs: 10000,
    maxOutputBytes: 65536,
    maxRetries: 1,
  },
  {
    id: 'worker-tester',
    version: '1.0.0',
    role: 'tester',
    classification: 'local-mutating',
    description: 'Executes strictly allowlisted local repository build and test targets under explicit human authorization.',
    capabilities: ['run-test-e2e', 'verify-build', 'check-types'],
    requiresApproval: true,
    timeoutMs: 45000,
    maxOutputBytes: 131072,
    maxRetries: 0,
  },
  {
    id: 'worker-security-reviewer',
    version: '1.0.0',
    role: 'security-reviewer',
    classification: 'read-only',
    description: 'Read-only reviewer inspecting proposed commands, diffs, credentials, and capability boundaries.',
    capabilities: ['review-contract', 'scan-secrets', 'audit-capabilities'],
    requiresApproval: false,
    timeoutMs: 5000,
    maxOutputBytes: 32768,
    maxRetries: 1,
  },
  {
    id: 'worker-governance-reviewer',
    version: '1.0.0',
    role: 'governance-reviewer',
    classification: 'read-only',
    description: 'Read-only policy, dissent, and charter compliance reviewer ensuring non-collapse of differences.',
    capabilities: ['policy-audit', 'verify-dissent', 'check-charter'],
    requiresApproval: false,
    timeoutMs: 5000,
    maxOutputBytes: 32768,
    maxRetries: 1,
  },
  {
    id: 'worker-github-inspector',
    version: '1.0.0',
    role: 'github-inspector',
    classification: 'read-only',
    description: 'Read-only GitHub repository inspector auditing pull requests, issues, commits, and CI status without granting universal mutation authority.',
    capabilities: ['inspect-pr', 'inspect-issue', 'inspect-ci', 'read-lineage'],
    requiresApproval: false,
    timeoutMs: 15000,
    maxOutputBytes: 65536,
    maxRetries: 1,
  },
];

export class WorkerRegistry {
  private readonly workers = new Map<string, OmegaWorkerDefinition>();

  constructor(customWorkers: OmegaWorkerDefinition[] = INITIAL_ENABLED_WORKERS) {
    for (const worker of customWorkers) {
      this.workers.set(worker.id, worker);
    }
  }

  public getWorker(id: string): OmegaWorkerDefinition | undefined {
    return this.workers.get(id);
  }

  public listWorkers(): OmegaWorkerDefinition[] {
    return Array.from(this.workers.values());
  }

  public validateRequestedWorkers(workerIds: string[]): {
    valid: boolean;
    missing: string[];
    requiresApproval: boolean;
  } {
    const missing: string[] = [];
    let requiresApproval = false;

    for (const id of workerIds) {
      const worker = this.workers.get(id);
      if (!worker) {
        missing.push(id);
      } else if (worker.requiresApproval) {
        requiresApproval = true;
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      requiresApproval,
    };
  }
}
