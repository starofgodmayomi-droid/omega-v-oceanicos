import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  FileCausalMemory,
  runOmegaChangePipeline,
  verifyRealityAttestation,
} from '../../packages/mini/dist/index.js';

const compile = {
  intent: 'persist a reconciled change',
  subject: 'repo:causal-memory',
  stateBefore: 'S0',
  evidenceRefs: [{ id: 'ev-c8', kind: 'test-result', source: 'integration', digest: 'sha256:c8' }],
  policyRefs: [{ id: 'policy:c8', version: '1', requirement: 'explicit authority' }],
  workerPlan: [],
  transition: { requestedStateAfter: 'S1', consequence: 'bounded local state change', dryRun: false },
  observation: { observerId: 'c8-test', targets: ['repo:causal-memory'], evidenceRequired: ['state'] },
};

const input = (memory: FileCausalMemory, observedState: string | (() => string), changeId: string) =>
  runOmegaChangePipeline({
    compile,
    admission: { authorityVerified: true, policySatisfied: true },
    authority: 'human:c8-test',
    policy: 'policy:c8',
    handler: () => ({ stateAfter: 'S1' }),
    observeState: typeof observedState === 'function' ? observedState : () => observedState,
    memory,
    realityAttestationKey: 'c8-test-signing-key',
    realityAttestationSignerId: 'test-attestor',
    realityAttestationKeyVersion: 'test-v1',
    changeId,
    now: () => '2026-09-20T19:00:00.000Z',
  });

describe('C7 reality attestation → C8 causal memory', () => {
  it('persists VERIFIED and replays the exact attestation/provenance record after reload', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'omega-c8-')), 'causal.jsonl');
    const first = new FileCausalMemory(path, { key: 'c8-test-signing-key' });
    const result = input(first, 'S1', 'c8-verified');
    assert.equal(result.reality?.status, 'VERIFIED');
    assert.ok(result.realityAttestation);
    assert.equal(first.verifyIntegrity(), true);

    const reloaded = new FileCausalMemory(path, { key: 'c8-test-signing-key' });
    const replayed = reloaded.replay('c8-verified');
    assert.ok(replayed);
    assert.deepEqual(replayed?.attestation, result.realityAttestation);
    assert.deepEqual(replayed?.record, result.record);
    assert.equal(reloaded.verifyIntegrity(), true);
    assert.equal(verifyRealityAttestation(replayed!.attestation, 'wrong-key'), false);
  });

  it('preserves DIVERGENT and UNKNOWN without upgrading either to VERIFIED', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'omega-c8-')), 'causal.jsonl');
    const memory = new FileCausalMemory(path, { key: 'c8-test-signing-key' });
    const divergent = input(memory, 'S2', 'c8-divergent');
    const unknown = input(memory, () => { throw new Error('observer offline'); }, 'c8-unknown');
    assert.equal(divergent.reality?.status, 'DIVERGENT');
    assert.equal(divergent.realityAttestation?.status, 'DIVERGENT');
    assert.equal(unknown.reality?.status, 'UNKNOWN');
    assert.equal(unknown.realityAttestation?.status, 'UNKNOWN');
    assert.equal(memory.all().map((entry) => entry.attestation.status).join(','), 'DIVERGENT,UNKNOWN');
  });

  it('fails closed for tampering, NOT_EXECUTED records, and unauthorized execution', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'omega-c8-')), 'causal.jsonl');
    const memory = new FileCausalMemory(path, { key: 'c8-test-signing-key' });
    const denied = runOmegaChangePipeline({
      compile,
      admission: { authorityVerified: false, policySatisfied: true },
      authority: 'human:c8-test',
      policy: 'policy:c8',
      memory,
      realityAttestationKey: 'c8-test-signing-key',
      changeId: 'c8-denied',
    });
    assert.equal(denied.execution, undefined);
    assert.equal(denied.realityAttestation, undefined);
    assert.throws(() => memory.append({ ...denied.record!, stateBefore: 'S0' }), /NOT_EXECUTED is not attestable/);

    input(memory, 'S1', 'c8-tamper-source');
    const line = readFileSync(path, 'utf8');
    writeFileSync(path, line.replace('"status":"VERIFIED"', '"status":"DIVERGENT"'));
    const tampered = new FileCausalMemory(path, { key: 'c8-test-signing-key' });
    assert.equal(tampered.verifyIntegrity(), false);
    assert.equal(tampered.replay('c8-tamper-source'), undefined);
  });
});
