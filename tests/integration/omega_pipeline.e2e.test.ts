import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import {
  runOmegaChangePipeline,
  createOmegaWorkerRegistry,
} from '../../packages/mini/dist/index.js';
import { RealityAttestationService } from '../../packages/attestation/dist/index.js';

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

const createRegistry = () =>
  createOmegaWorkerRegistry([
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

describe('Ω∞v unified change pipeline', () => {
  it('runs COMPILE → VALIDATE → ADMIT → EXECUTE → OBSERVE to VERIFIED', () => {
    const memory: unknown[] = [];
    const result = runOmegaChangePipeline({
      compile: compileBase,
      admission: { authorityVerified: true, policySatisfied: true },
      authority: 'human:pipeline',
      policy: 'policy:pipeline',
      registry: createRegistry(),
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

  it('carries C6 reality into a C7 cryptographic attestation without changing the truth status', () => {
    const keyPair = generateKeyPairSync('ed25519');
    const privateKey = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const publicKey = keyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const attester = new RealityAttestationService({
      algorithm: 'Ed25519',
      signingKey: privateKey,
      publicKey,
      keyVersion: 'reality-v1',
    });

    const verified = runOmegaChangePipeline({
      compile: compileBase,
      admission: { authorityVerified: true, policySatisfied: true },
      authority: 'human:pipeline',
      policy: 'policy:pipeline',
      registry: createRegistry(),
      observeState: () => 'S1',
      now: () => '2026-09-19T00:00:00.000Z',
      changeId: 'change-pipeline-c7-verified',
    });

    assert.equal(verified.reality?.status, 'VERIFIED');
    const verifiedAttestation = attester.attest(
      {
        changeId: verified.record!.id,
        executionAttestationId: verified.execution!.attestationId,
        realityStatus: verified.reality!.status,
        expectedState: verified.reality!.expectedState,
        observedState: verified.reality!.observedState,
        evidence: verified.reality!.evidence,
        observedAt: '2026-09-19T00:00:01.000Z',
      },
      { attestedBy: 'e2e', attestedAt: '2026-09-19T00:00:02.000Z' },
    );
    assert.equal(verifiedAttestation.realityStatus, 'VERIFIED');
    assert.equal(attester.verify(verifiedAttestation), true);
    assert.equal(attester.verify({ ...verifiedAttestation, observedState: 'S2' }), false);

    const divergent = runOmegaChangePipeline({
      compile: compileBase,
      admission: { authorityVerified: true, policySatisfied: true },
      authority: 'human:pipeline',
      policy: 'policy:pipeline',
      registry: createRegistry(),
      observeState: () => 'S2',
      changeId: 'change-pipeline-c7-divergent',
    });
    assert.equal(divergent.reality?.status, 'DIVERGENT');
    const divergentAttestation = attester.attest({
      changeId: divergent.record!.id,
      executionAttestationId: divergent.execution!.attestationId,
      realityStatus: divergent.reality!.status,
      expectedState: divergent.reality!.expectedState,
      observedState: divergent.reality!.observedState,
      evidence: divergent.reality!.evidence,
      observedAt: '2026-09-19T00:00:03.000Z',
    });
    assert.equal(divergentAttestation.realityStatus, 'DIVERGENT');
    assert.equal(attester.verify(divergentAttestation), true);

    const unknown = runOmegaChangePipeline({
      compile: compileBase,
      admission: { authorityVerified: true, policySatisfied: true },
      authority: 'human:pipeline',
      policy: 'policy:pipeline',
      registry: createRegistry(),
      observeState: () => {
        throw new Error('observer unavailable');
      },
      changeId: 'change-pipeline-c7-unknown',
    });
    assert.equal(unknown.reality?.status, 'UNKNOWN');
    const unknownAttestation = attester.attest({
      changeId: unknown.record!.id,
      executionAttestationId: unknown.execution!.attestationId,
      realityStatus: unknown.reality!.status,
      expectedState: unknown.reality!.expectedState,
      observedState: unknown.reality!.observedState,
      evidence: unknown.reality!.evidence,
      observedAt: '2026-09-19T00:00:04.000Z',
    });
    assert.equal(unknownAttestation.realityStatus, 'UNKNOWN');
    assert.equal(unknownAttestation.observedState, undefined);
    assert.equal(attester.verify(unknownAttestation), true);
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

  it('preserves UNKNOWN when the reality observer is unavailable', () => {
    const result = runOmegaChangePipeline({
      compile: compileBase,
      admission: { authorityVerified: true, policySatisfied: true },
      authority: 'human:pipeline',
      policy: 'policy:pipeline',
      handler: () => ({ stateAfter: 'S1' }),
      observeState: () => {
        throw new Error('observer unavailable');
      },
      changeId: 'change-pipeline-unknown',
    });
    assert.equal(result.halted, false);
    assert.equal(result.stage, 'OBSERVE');
    assert.equal(result.reality?.status, 'UNKNOWN');
    assert.equal(result.reality?.expectedState, 'S1');
    assert.equal(result.reality?.observedState, undefined);
    assert.equal(result.reality?.evidence, 'observation unavailable; reality could not be verified');
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

  it('halts at ADMIT when declared worker is not in the supplied registry', () => {
    const registry = createOmegaWorkerRegistry([
      {
        id: 'other-worker',
        version: '1.0.0',
        role: 'executor',
        mode: 'local-mutating',
        description: 'Unrelated bounded worker',
        inputSchema: 'stateBefore:string',
        outputSchema: 'stateAfter:string',
        authorityRequired: true,
        approvalRequired: false,
        policyRefs: ['policy:pipeline'],
        evidenceRequired: ['test-result'],
        timeoutMs: 1000,
        maxOutputBytes: 1024,
        retries: 0,
        dryRunSupported: true,
        rollbackSupported: false,
      },
    ]);

    const result = runOmegaChangePipeline({
      compile: compileBase,
      admission: { authorityVerified: true, policySatisfied: true },
      authority: 'human:pipeline',
      policy: 'policy:pipeline',
      registry,
      handler: () => ({ stateAfter: 'S1' }),
    });

    assert.equal(result.halted, true);
    assert.equal(result.haltReason, 'DENIED');
    assert.equal(result.stage, 'ADMIT');
    assert.equal(result.record?.decision, 'DENY');
    assert.equal(result.record?.authorized, false);
    assert.ok(result.lineage.some((entry) => entry.includes('Unknown worker')));
  });
});
