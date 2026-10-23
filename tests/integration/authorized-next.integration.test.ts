import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_NEXT_CANDIDATES,
  NEXT_SELECTOR_EPSILON,
  selectAuthorizedNext,
} from '../../packages/mini/src/next-selector.ts';

const candidate = (
  id: string,
  evidenceBackedValue: number,
  risk: number,
  cost: number,
  authorized = true,
) => ({ id, authorized, evidenceBackedValue, risk, cost });

const codes = (result: ReturnType<typeof selectAuthorizedNext>) =>
  result.status === 'INVALID' ? result.issues.map((issue) => issue.code) : [];

test('selects the authorized maximum of value over risk, cost, and epsilon', () => {
  const result = selectAuthorizedNext({
    candidates: [
      candidate('slow-safe', 9, 4, 4),
      candidate('direct-meaning', 3, 0, 0),
      candidate('costly', 30, 20, 20),
    ],
  });
  assert.equal(result.status, 'SELECTED');
  assert.equal(result.execution, 'NOT_STARTED');
  assert.equal(result.evidence, 'CALLER_SUPPLIED_ESTIMATES');
  assert.equal(result.authority, 'selection-is-not-permission');
  if (result.status !== 'SELECTED') throw new Error('expected a selection');
  assert.equal(result.selected.id, 'direct-meaning');
  assert.equal(result.score, 3 / NEXT_SELECTOR_EPSILON);
  assert.equal(result.epsilon, NEXT_SELECTOR_EPSILON);
  assert.deepEqual(
    result.ranking.map((entry) => entry.id),
    ['direct-meaning', 'slow-safe', 'costly'],
  );
  assert.equal(Object.isFrozen(result.selected), true);
  assert.equal(Object.isFrozen(result.ranking), true);
});

test('excludes unauthorized candidates even when their ratio would win', () => {
  const result = selectAuthorizedNext({
    candidates: [
      candidate('unpermitted', 1000, 0, 0, false),
      candidate('allowed-small', 1, 10, 10, true),
    ],
  });
  assert.equal(result.status, 'SELECTED');
  if (result.status !== 'SELECTED') throw new Error('expected a selection');
  assert.equal(result.selected.id, 'allowed-small');
  assert.equal(result.excludedUnauthorized, 1);
  assert.deepEqual(
    result.ranking.map((entry) => entry.id),
    ['allowed-small'],
  );
});

test('stops when nothing is authorized', () => {
  const empty = selectAuthorizedNext({ candidates: [] });
  assert.equal(empty.status, 'STOP');
  if (empty.status !== 'STOP') throw new Error('expected stop');
  assert.equal(empty.selected, null);
  assert.equal(empty.considered, 0);

  const refused = selectAuthorizedNext({
    candidates: [candidate('no', 5, 0, 0, false)],
  });
  assert.equal(refused.status, 'STOP');
  if (refused.status !== 'STOP') throw new Error('expected stop');
  assert.equal(refused.excludedUnauthorized, 1);
  assert.equal(refused.execution, 'NOT_STARTED');
});

test('breaks equal scores by lexicographic id', () => {
  const result = selectAuthorizedNext({
    candidates: [candidate('zeta', 2, 1, 1), candidate('alpha', 2, 1, 1)],
  });
  assert.equal(result.status, 'SELECTED');
  if (result.status !== 'SELECTED') throw new Error('expected a selection');
  assert.equal(result.selected.id, 'alpha');
  assert.equal(result.ranking[0]?.score, result.ranking[1]?.score);
});

test('rejects a vanishing epsilon, bad estimates, duplicate ids, and smuggled fields', () => {
  const result = selectAuthorizedNext({
    epsilon: 0,
    execute: true,
    candidates: [
      { id: '../x', authorized: 'yes', evidenceBackedValue: -1, risk: Number.NaN, cost: 1 },
      { ...candidate('alpha', 1, 0, 0), authority: 'self' },
      candidate('alpha', 1, 0, 0),
    ],
  });
  assert.equal(result.status, 'INVALID');
  assert.equal(result.evidence, 'INPUT_STRUCTURE_ONLY');
  for (const code of [
    'INVALID_EPSILON',
    'UNSUPPORTED_FIELD',
    'INVALID_ID',
    'INVALID_AUTHORITY_FLAG',
    'INVALID_ESTIMATE',
    'DUPLICATE_ID',
  ]) {
    assert.ok(codes(result).includes(code), code);
  }
});

test('rejects an oversized list, a missing flag, and non-object input', () => {
  const oversized = selectAuthorizedNext({
    candidates: Array.from({ length: MAX_NEXT_CANDIDATES + 1 }, (_, index) =>
      candidate(`c${index}`, 1, 1, 1),
    ),
  });
  assert.ok(codes(oversized).includes('INVALID_CANDIDATE_LIST'));

  const omitted = selectAuthorizedNext({
    candidates: [{ id: 'bare', evidenceBackedValue: 1, risk: 0, cost: 0 }],
  });
  assert.ok(codes(omitted).includes('INVALID_AUTHORITY_FLAG'));
  assert.ok(codes(selectAuthorizedNext(null)).includes('INVALID_REQUEST_SHAPE'));
});

test('does not mutate the caller and fails closed on hostile inspection', () => {
  const input = { candidates: [candidate('kept', 2, 1, 1)] };
  const snapshot = JSON.stringify(input);
  const result = selectAuthorizedNext(input);
  assert.equal(result.status, 'SELECTED');
  assert.equal(JSON.stringify(input), snapshot);

  const hostile = new Proxy(
    {},
    {
      ownKeys: () => {
        throw new Error('inspection denied');
      },
    },
  );
  assert.ok(codes(selectAuthorizedNext(hostile)).includes('REQUEST_INSPECTION_FAILED'));
});
