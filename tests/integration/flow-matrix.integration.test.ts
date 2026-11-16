import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FLOW_COMPOSE_ACTUAL,
  FLOW_MATRIX_CELLS,
  FLOW_READ_ACTUAL,
  compressFlowMatrix,
  enumerateFlowCells,
  hashFlowText,
  stepFlow,
  type FlowCell,
} from '../../packages/mini/src/flow-matrix.ts';

const prior = 'ab'.repeat(32);
const openRead: FlowCell = { work: 'read', authority: 'met', evidence: 'present', claim: 'ordinary' };

test('the matrix is a partition of 24 cells and none are verified before a witness', () => {
  const cells = enumerateFlowCells();
  assert.equal(cells.length, FLOW_MATRIX_CELLS);
  const keys = new Set(cells.map((cell) => `${cell.work}|${cell.authority}|${cell.evidence}|${cell.claim}`));
  assert.equal(keys.size, FLOW_MATRIX_CELLS);
  const compressed = compressFlowMatrix();
  assert.equal(compressed.verifiedBeforeWitness, 0);
  assert.equal(compressed.open, 2);
  assert.equal(compressed.divergent, 12);
  assert.equal(compressed.notExecuted, 8);
  assert.equal(compressed.unknown, 2);
  assert.equal(compressed.open + compressed.divergent + compressed.notExecuted + compressed.unknown, 24);
});

test('a witnessed local read is appended once and does not mutate the prior list', () => {
  const step = stepFlow({
    cell: openRead,
    intent: 'hold this drop',
    expected: FLOW_READ_ACTUAL,
    witness: hashFlowText(FLOW_READ_ACTUAL),
    memory: [prior],
  });
  assert.equal(step.status, 'VERIFIED');
  assert.equal(step.executed, true);
  assert.equal(step.ledgerMutation, false);
  assert.equal(step.upgradeExecution, 'NOT_EXECUTED');
  assert.equal(step.appended, true);
  assert.equal(step.memory.length, 2);
  assert.equal(step.memory[0], prior);
  const again = stepFlow({
    cell: openRead,
    intent: 'hold this drop',
    expected: FLOW_READ_ACTUAL,
    witness: hashFlowText(FLOW_READ_ACTUAL),
    memory: step.memory,
  });
  assert.equal(again.appended, false);
  assert.equal(again.memory.length, 2);
});

test('a caller who copies the expected sentence is not verified', () => {
  const step = stepFlow({
    cell: openRead,
    intent: 'hold this drop',
    expected: FLOW_READ_ACTUAL,
    witness: null,
    memory: [prior],
  });
  assert.equal(step.status, 'UNKNOWN');
  assert.equal(step.reason, 'CALLER_MATCH');
  assert.equal(step.appended, false);
  assert.deepEqual(step.memory, [prior]);
});

test('a wrong expectation is divergent and external work is not executed', () => {
  const divergent = stepFlow({
    cell: { work: 'compose', authority: 'met', evidence: 'present', claim: 'ordinary' },
    intent: 'compose a local note',
    expected: 'Order filled on an exchange',
    witness: hashFlowText(FLOW_COMPOSE_ACTUAL),
    memory: [prior],
  });
  assert.equal(divergent.status, 'DIVERGENT');
  assert.equal(divergent.reason, 'EXPECTED_NOT_OBSERVED');
  assert.equal(divergent.actual, FLOW_COMPOSE_ACTUAL);
  assert.equal(divergent.executed, false);

  const external = stepFlow({
    cell: { work: 'external', authority: 'met', evidence: 'present', claim: 'ordinary' },
    intent: 'buy btc with the treasury',
    expected: FLOW_READ_ACTUAL,
    witness: hashFlowText(FLOW_READ_ACTUAL),
    memory: [prior],
  });
  assert.equal(external.status, 'NOT_EXECUTED');
  assert.equal(external.reason, 'VENUE');
  assert.equal(external.actual, null);
  assert.equal(external.deltaHash, null);
});

test('scam dominates authority and venue, and a bad witness does not append', () => {
  const scam = stepFlow({
    cell: { work: 'external', authority: 'met', evidence: 'present', claim: 'scam' },
    intent: 'draft a script to scam someone out of savings',
    expected: FLOW_READ_ACTUAL,
    witness: hashFlowText(FLOW_READ_ACTUAL),
    memory: [prior],
  });
  assert.equal(scam.status, 'DIVERGENT');
  assert.equal(scam.reason, 'SCAM');
  assert.equal(scam.executed, false);

  const witness = stepFlow({
    cell: openRead,
    intent: 'hold this drop',
    expected: FLOW_READ_ACTUAL,
    witness: 'c'.repeat(64),
    memory: [prior],
  });
  assert.equal(witness.status, 'DIVERGENT');
  assert.equal(witness.reason, 'WITNESS');
  assert.deepEqual(witness.memory, [prior]);
});
