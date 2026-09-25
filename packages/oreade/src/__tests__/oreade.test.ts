import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSymbolicDrop,
  classifySymbolicIntent,
  renderPidginBoundary,
} from '../index.js';

test('translates symbolic intent into a bounded proposal without granting authority', () => {
  const drop = buildSymbolicDrop({
    symbolicIntent: 'activate a community wisdom reflection',
    requestedBy: 'telegram:8632545391',
    targetScope: ['oracle:reflection'],
    idempotencyKey: 'reflection-001',
    stopCondition: 'stop after one generated reflection',
    expectedObservation: 'one response labeled symbolic is returned',
  }, new Date('2026-09-25T11:00:00.000Z'));

  assert.equal(drop.dropId, 'drop:oreade:7a8644e6');
  assert.equal(drop.kind, 'EXECUTION');
  assert.equal(drop.mode, 'BUILD');
  assert.equal(drop.authority, 'MUST_BE_SUPPLIED_BY_RUNTIME');
  assert.equal(drop.admission, 'NOT_GRANTED_BY_TRANSLATION');
  assert.equal(drop.createdAt, '2026-09-25T11:00:00.000Z');
  assert.match(drop.evidenceBoundary, /does not prove supernatural agency/);
});

test('keeps retry identity stable and target scope deduplicated', () => {
  const input = {
    symbolicIntent: 'read the current oracle status',
    requestedBy: 'operator:demo',
    targetScope: ['oracle:status', 'oracle:status'],
    idempotencyKey: 'status-001',
    stopCondition: 'stop after one observation',
    expectedObservation: 'status observation is recorded',
  };
  const first = buildSymbolicDrop(input, new Date('2026-01-01T00:00:00.000Z'));
  const second = buildSymbolicDrop(input, new Date('2027-01-01T00:00:00.000Z'));

  assert.equal(first.dropId, second.dropId);
  assert.deepEqual(first.targetScope, ['oracle:status']);
  assert.notEqual(first.createdAt, second.createdAt);
});

test('classifies requests without treating symbolism as authority', () => {
  assert.equal(classifySymbolicIntent('compare the observation with reality'), 'RECONCILIATION');
  assert.equal(classifySymbolicIntent('record evidence for this claim'), 'EVIDENCE_PROBE');
  assert.equal(classifySymbolicIntent('ask the community a question'), 'PROPOSAL');
});

test('rejects missing bounded fields before a Drop exists', () => {
  assert.throws(
    () => buildSymbolicDrop({
      symbolicIntent: 'do something',
      requestedBy: 'operator:demo',
      targetScope: [],
      idempotencyKey: 'x',
      stopCondition: 'stop',
      expectedObservation: 'observe',
    }),
    /targetScope/,
  );
});

test('renders a warm boundary without claiming completion', () => {
  const drop = buildSymbolicDrop({
    symbolicIntent: 'offer guidance',
    requestedBy: 'operator:demo',
    targetScope: ['guidance'],
    idempotencyKey: 'guide-001',
    stopCondition: 'stop after one answer',
    expectedObservation: 'one answer is returned',
  });

  assert.match(renderPidginBoundary(drop), /no be proof/);
  assert.match(renderPidginBoundary(drop), /authorize, execute, observe/);
});
