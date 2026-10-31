import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initialOreadSubmissionIdentity,
  prepareOreadSubmission,
} from '../oreade-submission.ts';

const request = {
  symbolicIntent: 'prepare one bounded reflection',
  requestedBy: 'dashboard-user',
  targetScope: ['oracle:reflection'],
  stopCondition: 'stop after one proposal',
  expectedObservation: 'one proposal is persisted',
  mode: 'BUILD' as const,
};

test('unchanged OREAD request reuses its idempotency key across retries', () => {
  const first = prepareOreadSubmission(request, initialOreadSubmissionIdentity(), 1000);
  const retry = prepareOreadSubmission(request, first.identity, 2000);

  assert.equal(retry.payload.idempotencyKey, first.payload.idempotencyKey);
  assert.deepEqual(retry.payload, first.payload);
});

test('materially changed OREAD request receives a fresh idempotency key', () => {
  const first = prepareOreadSubmission(request, initialOreadSubmissionIdentity(), 1000);
  const changed = prepareOreadSubmission(
    { ...request, symbolicIntent: 'prepare a different bounded reflection' },
    first.identity,
    1000,
  );

  assert.notEqual(changed.payload.idempotencyKey, first.payload.idempotencyKey);
  assert.equal(changed.identity.sequence, first.identity.sequence + 1);
});

test('changing translation mode to WORLDVIEW creates a fresh idempotent submission', () => {
  const first = prepareOreadSubmission(request, initialOreadSubmissionIdentity(), 1000);
  const worldview = prepareOreadSubmission(
    { ...request, mode: 'WORLDVIEW' },
    first.identity,
    1000,
  );

  assert.equal(first.payload.mode, 'BUILD');
  assert.equal(worldview.payload.mode, 'WORLDVIEW');
  assert.notEqual(worldview.payload.idempotencyKey, first.payload.idempotencyKey);
  assert.equal(worldview.identity.sequence, first.identity.sequence + 1);
});
