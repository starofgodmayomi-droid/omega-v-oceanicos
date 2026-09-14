import assert from 'node:assert/strict';
import test from 'node:test';
import { compileQovCommand, createQovCycleRecord, proposeQovEvolution } from '../index.ts';

const block = {
  index: 7,
  timestamp: '2026-09-13T20:00:00.000Z',
  observation: {
    uuid: 'observation-7',
    timestamp: '2026-09-13T19:59:59.000Z',
    siliconYield: 0.942,
    gridLoadMegawatts: 1250,
    acceleratorInventory: 989210,
  },
  evidence: {
    status: 'PASS' as const,
    lawRoute: '0 ➔ MINI ➔ FULL_STACK ➔ ECOSYSTEM',
    timestamp: '2026-09-13T20:00:00.000Z',
    observationUuid: 'observation-7',
    signatureProof: 'verification-proof-7',
  },
  previousHash: 'previous-hash',
  hash: 'memory-hash-7',
  nonce: 3,
};

test('Qov wraps an OceanicOS MINI block without losing provenance', () => {
  const record = createQovCycleRecord(block);

  assert.equal(record.identity, 'Qov');
  assert.equal(record.stage, 'remember');
  assert.equal(record.provenance.observationId, 'observation-7');
  assert.equal(record.provenance.verificationId, 'verification-proof-7');
  assert.equal(record.provenance.memoryId, 'memory-hash-7');
  assert.equal(record.provenance.source, 'oceanicos-mini');
  assert.equal(record.externalWrites, 'disabled');
  assert.equal(record.uncertainty, 'unattested');
});

test('Qov evolution remains a proposal until human authorization', () => {
  const proposal = proposeQovEvolution(createQovCycleRecord(block), 'Add a second local verification rule');

  assert.equal(proposal.status, 'proposed');
  assert.equal(proposal.authorization, 'human-required');
  assert.equal(proposal.sideEffects, 'none-until-approved');
  assert.throws(() => proposeQovEvolution(createQovCycleRecord(block), '   '), /non-empty/);
  assert.throws(() => proposeQovEvolution(createQovCycleRecord(block), 'x'.repeat(501)), /500 characters/);
});

test('Qov compiles grounded OceanicOS commands into finite plans', () => {
  const observe = compileQovCommand('OBSERVE service.health');
  assert.equal(observe.status, 'ready');
  assert.equal(observe.requiresHumanApproval, false);
  assert.equal(observe.sideEffects, 'none');

  const direct = compileQovCommand('DIRECT service threshold 120');
  assert.equal(direct.status, 'proposal-required');
  assert.equal(direct.requiresHumanApproval, true);
  assert.equal(direct.sideEffects, 'local-proposal-only');
});

test('Qov blocks non-finite transcendence and rejects unsafe or unbounded input', () => {
  const blocked = compileQovCommand('TRANSCEND');
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.sideEffects, 'none');
  assert.match(blocked.limitation ?? '', /cannot be executed/);
  assert.throws(() => compileQovCommand('DIRECT service threshold'), /requires target/);
  assert.throws(() => compileQovCommand(`OBSERVE ${'x'.repeat(97)}`), /safe target/);
  assert.throws(() => compileQovCommand('rm -rf /'), /unsupported Qov command/);
});
