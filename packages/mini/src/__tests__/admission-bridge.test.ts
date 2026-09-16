import { describe, expect, it } from 'vitest';
import type { OmegaChangeRecord, OmegaIR, OmegaWorkerCapability, OmegaWorkerRegistry } from '@oceanicos/types';
import { admitOmegaIR } from '../admission-bridge.js';

const worker: OmegaWorkerCapability = {
  id: 'tester',
  version: '1.0.0',
  role: 'tester',
  mode: 'build-test',
  description: 'Bounded repository test worker.',
  inputSchema: 'omega.test.input.v1',
  outputSchema: 'omega.test.output.v1',
  authorityRequired: true,
  approvalRequired: true,
  policyRefs: ['policy.test.v1'],
  evidenceRequired: ['test-result'],
  timeoutMs: 5000,
  maxOutputBytes: 65536,
  retries: 0,
  dryRunSupported: true,
  rollbackSupported: false,
};

const registry: OmegaWorkerRegistry = { version: 'omega-workers.v1', workers: [worker] };

const ir: OmegaIR = {
  version: 'omega-ir.v1',
  intent: 'Run bounded tests',
  evidenceRefs: [{ id: 'e1', kind: 'test-result', source: 'ci' }],
  policyRefs: [{ id: 'policy.test.v1', version: '1', requirement: 'tests allowed' }],
  workerPlan: [{
    workerId: 'tester',
    version: '1.0.0',
    capability: 'repository-test',
    mode: 'build-test',
    approvalRequired: true,
  }],
  transitionSpec: {
    subject: 'repository',
    intent: 'Run bounded tests',
    stateBefore: 'clean',
    dryRun: true,
  },
  observationSpec: {
    observerId: 'observer',
    targets: ['test-result'],
    evidenceRequired: ['test-result'],
  },
};

const change: OmegaChangeRecord = {
  id: 'change-1',
  subject: 'repository',
  intent: 'Run bounded tests',
  stateBefore: 'clean',
  evidence: ['e1'],
  authority: 'operator:verified',
  policy: 'policy.test.v1',
  decision: 'REVIEW',
  authorized: false,
  provenance: {
    source: 'test',
    observedAt: '2026-09-16T00:00:00Z',
    attributedTo: 'operator',
  },
  createdAt: '2026-09-16T00:00:00Z',
};

describe('Omega admission bridge', () => {
  it('binds a matching IR and registry to the existing admission gate', () => {
    const result = admitOmegaIR({
      ir,
      registry,
      change,
      authorityVerified: true,
      policySatisfied: true,
    });

    expect(result.registryMatched).toBe(true);
    expect(result.policyReferencesSatisfied).toBe(true);
    expect(result.evidenceRequirementsSatisfied).toBe(true);
    expect(result.change.decision).toBe('ALLOW');
    expect(result.change.authorized).toBe(true);
  });

  it('fails closed for an undeclared worker', () => {
    const result = admitOmegaIR({
      ir: { ...ir, workerPlan: [{ ...ir.workerPlan[0], workerId: 'missing' }] },
      registry,
      change,
      authorityVerified: true,
      policySatisfied: true,
    });

    expect(result.registryMatched).toBe(false);
    expect(result.change.decision).toBe('DENY');
    expect(result.change.authorized).toBe(false);
  });

  it('never upgrades REVIEW when authority or policy evidence is missing', () => {
    const result = admitOmegaIR({
      ir,
      registry,
      change,
      authorityVerified: false,
      policySatisfied: true,
    });

    expect(result.change.decision).toBe('DENY');
    expect(result.change.authorized).toBe(false);
  });
});
