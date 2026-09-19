import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  runOmegaChangePipeline,
  createOmegaWorkerRegistry,
} from '../../packages/mini/dist/index.js';

const compileBase = {
  intent: 'advance verified state',
  subject: 'repo:pipeline',
  stateBefore: 'S0',
  evidenceRefs: [{ id: 'ev-1', kind: 'test-result', source: 'ci', digest: 'sha256:deadbeef' }],
  policyRefs: [{ id: 'policy:pipeline', version: '1', requirement: 'authority verified' }],
  workerPlan: [
    {
      workerId: 'state-advancer',
      version: '1.0.0',
      capability: 'local-state',
      mode: 'local-mutating' as const,
      approvalRequired: false,
    },
  ],
  transition: {
    requestedStateAfter: 'S1',
    consequence: 'state advanced under pipeline',
    dryRun: false,
  },
  observation: {
    observerId: 'pipeline-observer',
    targets: ['repo:pipeline'],
    evidenceRequired: ['state hash'],
  },
};

describe('Ω∞v unified change pipeline', () => {
  it('runs COMPILE → VALIDATE → ADMIT → EXECUTE → OBSERVE to VERIFIED', () => {
    const registry = createOmegaWorkerRegistry([
      {
        id: 'state-advancer',
        version: '1.0.0',
        role: 'executor',
        mode: 'local-mutating',
        description: 'Advances local declarative state only',
        inputSchema: 'stateBefore:string',
        outputSchema: 'stateAfter:string',
        authorityRequired: true,
        approvalRequired: false,
        policyRefs: ['policy:pipeline'],
        evidenceRequired: ['sha256:deadbeef'],
        timeoutMs: 1000,
        maxOutputBytes: 1024,
        retries: 0,
        dryRunSupported: true,
        rollbackSupported: false,
      },
    ]);

    const memory: unknown[] = [];
    const result = runOmegaChangePipeline({
      compile: compileBase,
      admission: { authorityVerified: true, policySatisfied: true },
      authority: 'human:pipeline',
      policy: 'policy:pipeline',
      registry,
      observeState: () => 'S1',
      memory: { append: (r) => memory.push(r) },
      now: () => '2026-09-19T00:00:00.000Z',
      changeId: 'change-pipeline-1',
    });

    assert.equal(result.halted, false);
    assert.equal(result.stage, 'OBSERVE');
    assert.equal(result.validation?.valid, true);
    assert.equal(result.execution?.status, 'EXECUTED');
    assert.equal(result.reality?.status, 'VERIFIED');
    assert.equal(result.reality?.observedState, 'S1');
    assert.match(result.reality?.evidence ?? '', /^sha256:[a-f0-9]{64}$/);
    assert.match(result.provenanceRoot, /^prov-root-[a-f0-9]{64}$/);
    assert.ok(result.lineage.some((e) => e.startsWith('attestation-')));
    assert.ok(result.lineage.some((e) => e.startsWith('reality:VERIFIED') || e.includes('observation-')));
    assert.ok(memory.length >= 1);
  });

  it('fails closed at compile when intent is empty', () => {
    assert.throws(
      () =>
        runOmegaChangePipeline({
          compile: {
            ...compileBase,
            intent: '   ',
          },
          admission: { authorityVerified: true, policySatisfied: true },
          authority: 'human:pipeline',
          policy: 'policy:pipeline',
        }),
      /non-empty intent/,
    );
  });

  it('halts at ADMIT when policy is not satisfied', () => {
    const result = runOmegaChangePipeline({
      compile: compileBase,
      admission: { authorityVerified: true, policySatisfied: false },
      authority: 'human:pipeline',
      policy: 'policy:pipeline',
      handler: () => ({ stateAfter: 'S1' }),
    });
    assert.equal(result.halted, true);
    assert.equal(result.haltReason, 'DENIED');
    assert.equal(result.stage, 'ADMIT');
    assert.equal(result.record?.decision, 'DENY');
  });

  it('records DIVERGENT when observation disagrees with expected state', () => {
    const result = runOmegaChangePipeline({
      compile: compileBase,
      admission: { authorityVerified: true, policySatisfied: true },
      authority: 'human:pipeline',
      policy: 'policy:pipeline',
      handler: () => ({ stateAfter: 'S1' }),
      observeState: () => 'S2',
      changeId: 'change-pipeline-divergent',
    });
    assert.equal(result.halted, false);
    assert.equal(result.stage, 'OBSERVE');
    assert.equal(result.reality?.status, 'DIVERGENT');
    assert.equal(result.reality?.expectedState, 'S1');
    assert.equal(result.reality?.observedState, 'S2');
  });

  it('fails closed when worker is missing and no handler is provided', () => {
    const result = runOmegaChangePipeline({
      compile: compileBase,
      admission: { authorityVerified: true, policySatisfied: true },
      authority: 'human:pipeline',
      policy: 'policy:pipeline',
    });
    assert.equal(result.halted, true);
    assert.equal(result.haltReason, 'WORKER_NOT_FOUND');
    assert.equal(result.stage, 'EXECUTE');
  });
});
