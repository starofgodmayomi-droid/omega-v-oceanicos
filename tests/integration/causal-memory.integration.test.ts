import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
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
  it('treats only a missing journal as a healthy empty start', () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-c8-read-error-'));
    const missing = new FileCausalMemory(join(directory, 'missing.jsonl'), { key: 'c8-test-signing-key' });
    assert.equal(missing.verifyIntegrity(), true);
    assert.deepEqual(missing.all(), []);

    const directoryPath = join(directory, 'journal-directory');
    mkdirSync(directoryPath);
    const unreadable = new FileCausalMemory(directoryPath, { key: 'c8-test-signing-key' });
    assert.equal(unreadable.verifyIntegrity(), false);
    assert.deepEqual(unreadable.all(), []);
    assert.equal(unreadable.replay('c8-missing'), undefined);
  });

  it('degrades if a previously observed journal disappears during reload', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'omega-c8-disappeared-')), 'causal.jsonl');
    const memory = new FileCausalMemory(path, { key: 'c8-test-signing-key' });
    input(memory, 'S1', 'c8-disappearing-journal');
    const reader = new FileCausalMemory(path, { key: 'c8-test-signing-key' });
    assert.equal(reader.verifyIntegrity(), true);

    unlinkSync(path);
    assert.deepEqual(reader.reload(), []);
    assert.equal(reader.verifyIntegrity(), false);
    assert.deepEqual(reader.all(), []);
    assert.equal(reader.replay('c8-disappearing-journal'), undefined);
  });

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

  it('rejects a reality observation whose record differs from the persisted change', () => {
    const primaryPath = join(mkdtempSync(join(tmpdir(), 'omega-c8-provenance-primary-')), 'causal.jsonl');
    const secondaryPath = join(mkdtempSync(join(tmpdir(), 'omega-c8-provenance-secondary-')), 'causal.jsonl');
    const primary = new FileCausalMemory(primaryPath, { key: 'c8-test-signing-key' });
    const secondary = new FileCausalMemory(secondaryPath, { key: 'c8-test-signing-key' });
    const first = input(primary, 'S1', 'c8-provenance-first');
    const second = input(secondary, 'S1', 'c8-provenance-second');

    assert.ok(first.reality && first.realityAttestation && second.record);
    assert.throws(
      () => primary.appendCausal(second.record!, first.reality!, first.realityAttestation!),
      /mismatched reality attestation/,
    );
    assert.deepEqual(primary.all().map((entry) => entry.record.id), ['c8-provenance-first']);
  });

  it('does not expose a valid prefix after a later journal entry is corrupted', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'omega-c8-prefix-')), 'causal.jsonl');
    const memory = new FileCausalMemory(path, { key: 'c8-test-signing-key' });
    input(memory, 'S1', 'c8-prefix-valid');
    input(memory, 'S1', 'c8-prefix-corrupted-suffix');

    const reader = new FileCausalMemory(path, { key: 'c8-test-signing-key' });
    assert.equal(reader.verifyIntegrity(), true);
    const lines = readFileSync(path, 'utf8').trim().split('\n');
    const corruptedSuffix = JSON.parse(lines[1] ?? 'null') as { record: { intent: string } };
    assert.ok(corruptedSuffix);
    corruptedSuffix.record.intent = 'modified without updating the entry hash';
    lines[1] = JSON.stringify(corruptedSuffix);
    writeFileSync(path, `${lines.join('\n')}\n`);

    assert.deepEqual(reader.reload(), []);
    assert.equal(reader.verifyIntegrity(), false);
    assert.deepEqual(reader.all(), []);
    assert.equal(reader.replay('c8-prefix-valid'), undefined);
  });
});
