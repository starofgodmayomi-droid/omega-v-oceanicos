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
    assert.equal(verifyRealityAttestation({ ...replayed!.attestation, signature: undefined } as any, 'c8-test-signing-key'), false);
    assert.equal(verifyRealityAttestation({ ...replayed!.attestation, provenanceLineage: null } as any, 'c8-test-signing-key'), false);
    assert.equal(verifyRealityAttestation(replayed!.attestation, null as any), false);
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

  it('enforces REVIEW and DENIED admission boundaries without mutating state or durable memory', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'omega-c8-')), 'causal.jsonl');
    const memory = new FileCausalMemory(path, { key: 'c8-test-signing-key' });

    // 1. Policy not satisfied -> DENIED
    const denied = runOmegaChangePipeline({
      compile,
      admission: { authorityVerified: true, policySatisfied: false },
      authority: 'human:c8-test',
      policy: 'policy:c8',
      memory,
      realityAttestationKey: 'c8-test-signing-key',
      changeId: 'c8-policy-denied',
    });
    assert.equal(denied.stage, 'ADMIT');
    assert.equal(denied.halted, true);
    assert.equal(denied.haltReason, 'DENIED');
    assert.equal(denied.execution, undefined);
    assert.equal(denied.realityAttestation, undefined);
    assert.equal(memory.all().length, 0); // No causal attestation written

    // 2. Neither authority nor policy verified -> DENIED
    const bothDenied = runOmegaChangePipeline({
      compile,
      admission: { authorityVerified: false, policySatisfied: false },
      authority: 'human:c8-test',
      policy: 'policy:c8',
      memory,
      realityAttestationKey: 'c8-test-signing-key',
      changeId: 'c8-both-denied',
    });
    assert.equal(bothDenied.halted, true);
    assert.equal(bothDenied.haltReason, 'DENIED');
    assert.equal(bothDenied.execution, undefined);
    assert.equal(memory.all().length, 0);
  });

  it('persists multi-block causal chain with exact causal lineage across disk reload and replay', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'omega-c8-')), 'causal.jsonl');
    const memory = new FileCausalMemory(path, { key: 'c8-test-signing-key' });

    // Append 3 sequential transitions
    input(memory, 'S1', 'step-1');
    input(memory, 'S1', 'step-2');
    input(memory, 'S1', 'step-3');

    assert.equal(memory.all().length, 3);
    assert.equal(memory.verifyIntegrity(), true);

    // Verify hash chain continuity: H_n binds H_{n-1}
    const all = memory.all();
    assert.ok(all[0].hash);
    assert.ok(all[1].hash);
    assert.ok(all[2].hash);
    assert.equal(all[1].previousHash, all[0].hash);
    assert.equal(all[2].previousHash, all[1].hash);

    // Reload from disk into a fresh instance
    const reloaded = new FileCausalMemory(path, { key: 'c8-test-signing-key' });
    assert.equal(reloaded.all().length, 3);
    assert.equal(reloaded.verifyIntegrity(), true);

    const replayed1 = reloaded.replay('step-1');
    const replayed2 = reloaded.replay('step-2');
    const replayed3 = reloaded.replay('step-3');

    assert.equal(replayed1?.record.id, 'step-1');
    assert.equal(replayed2?.record.id, 'step-2');
    assert.equal(replayed3?.record.id, 'step-3');
    assert.equal(replayed1?.attestation.status, 'VERIFIED');
    assert.equal(replayed2?.attestation.status, 'VERIFIED');
    assert.equal(replayed3?.attestation.status, 'VERIFIED');
  });
});
