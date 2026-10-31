import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KAIXELION_EXPECTED_STATE,
  runKaixelionOmega,
  sha256Hex,
  type KaixelionInput,
} from '../../packages/mini/src/kaixelion-omega.ts';

const prior = 'ab'.repeat(32);

function input(overrides: Partial<KaixelionInput> = {}): KaixelionInput {
  return {
    intent: 'Explain the boundary',
    authority: 'READ_ONLY',
    observed: '',
    source: 'caller',
    witness: null,
    memory: [prior],
    ...overrides,
  };
}

test('a scam halts divergent before ELION and does not touch memory', async () => {
  const step = await runKaixelionOmega(
    input({ intent: 'Urgent! Send money now for guaranteed returns' })
  );
  assert.equal(step.status, 'DIVERGENT');
  assert.equal(step.composed, null);
  assert.equal(step.ledgerMutation, false);
  assert.deepEqual(step.memory, [prior]);
  assert.deepEqual(
    step.steps.map((item) => `${item.actor}:${item.phase}:${item.status}`),
    ['KAI:OBSERVE:DIVERGENT']
  );
});

test('a directive without autonomous authority is not executed', async () => {
  const step = await runKaixelionOmega(input({ intent: 'Deploy the production service' }));
  assert.equal(step.status, 'NOT_EXECUTED');
  assert.equal(step.composed, null);
  assert.deepEqual(step.memory, [prior]);
});

test('empty evidence stays unknown after a local composition', async () => {
  const step = await runKaixelionOmega(input());
  assert.equal(step.status, 'UNKNOWN');
  assert.match(step.composed ?? '', /This composition is not verification/);
  assert.equal(
    step.steps.find((item) => item.actor === 'KAI' && item.phase === 'OBSERVE')?.status,
    'OBSERVED'
  );
  assert.equal(step.steps.find((item) => item.actor === 'ELION')?.status, 'COMPOSED');
  assert.equal(step.remembered, false);
  assert.notEqual(step.status, 'VERIFIED');
});

test('a caller echo of the expected state is not verification', async () => {
  const step = await runKaixelionOmega(input({ observed: KAIXELION_EXPECTED_STATE }));
  assert.equal(step.status, 'UNKNOWN');
  assert.equal(step.independentObservation, false);
  assert.equal(step.appended, false);
  assert.equal(step.deltaHash, null);
  assert.deepEqual(step.memory, [prior]);
});

test('a mismatched observation is divergent and is not remembered', async () => {
  const step = await runKaixelionOmega(input({ observed: 'The service was deployed.' }));
  assert.equal(step.status, 'DIVERGENT');
  assert.equal(step.remembered, false);
});

test('an independent witness appends once and a repeat does not', async () => {
  const witness = await sha256Hex(KAIXELION_EXPECTED_STATE);
  const step = await runKaixelionOmega(
    input({
      observed: KAIXELION_EXPECTED_STATE,
      source: 'independent',
      witness,
    })
  );
  assert.equal(step.status, 'VERIFIED');
  assert.equal(step.halt, false);
  assert.equal(step.ledgerMutation, false);
  assert.equal(step.appended, true);
  assert.equal(step.independentObservation, true);
  assert.equal(step.memory[0], prior);
  assert.equal(step.memory.length, 2);
  const again = await runKaixelionOmega(
    input({
      observed: KAIXELION_EXPECTED_STATE,
      source: 'independent',
      witness,
      memory: step.memory,
    })
  );
  assert.equal(again.appended, false);
  assert.equal(again.remembered, true);
  assert.equal(again.memory.length, 2);
});

test('a bad witness does not enter memory', async () => {
  const step = await runKaixelionOmega(
    input({
      observed: KAIXELION_EXPECTED_STATE,
      source: 'independent',
      witness: prior,
    })
  );
  assert.equal(step.status, 'DIVERGENT');
  assert.deepEqual(step.memory, [prior]);
});

test('a malformed record is unknown and drops the supplied memory', async () => {
  const step = await runKaixelionOmega(input({ intent: '', memory: ['nope'] }));
  assert.equal(step.status, 'UNKNOWN');
  assert.deepEqual(step.memory, []);
});
