import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  COMPRESSED_ECOSYSTEM_BODY,
  OCEANICOS_SINGLE_LINE,
  reconcileVerifiedImprovement,
  selectBestAuthorizedAction,
} from '../../packages/mini/dist/index.js';
import type { AuthorizedDelta } from '../../packages/mini/dist/index.js';

const constraints = (held: boolean) => ({
  TRUTH: held,
  SAFETY: held,
  PRIVACY: held,
  CONSENT: held,
  SECURITY: held,
  HUMAN_AUTHORITY: held,
});

const delta = (patch: Partial<AuthorizedDelta> & Pick<AuthorizedDelta, 'id'>): AuthorizedDelta => ({
  declaredVerifiedValue: 10,
  risk: 1,
  cost: 1,
  authorized: true,
  constraints: constraints(true),
  ...patch,
});

test('locks the single-line ocecosystem compression and body map', () => {
  assert.match(OCEANICOS_SINGLE_LINE, /SELECT_BEST_AUTHORIZED_ACTION/);
  assert.match(OCEANICOS_SINGLE_LINE, /SUBJECT_TO\(TRUTH, SAFETY, PRIVACY, CONSENT, SECURITY, HUMAN_AUTHORITY\)/);
  assert.equal(COMPRESSED_ECOSYSTEM_BODY.mind.M, 'memory');
  assert.equal(COMPRESSED_ECOSYSTEM_BODY.body.G, 'github');
  assert.equal(COMPRESSED_ECOSYSTEM_BODY.nervousSystem.N, 'notion');
  assert.equal(COMPRESSED_ECOSYSTEM_BODY.valuesAndTruth.Q, 'quality');
  assert.equal(COMPRESSED_ECOSYSTEM_BODY.oneBody, 'UNIFY → VERIFY → IMPROVE → RECONCILE → RETURN');
});

test('selects the authorized action with the highest declared value per risk and cost', () => {
  const result = selectBestAuthorizedAction({
    candidates: [
      delta({ id: 'slow', declaredVerifiedValue: 9, risk: 4, cost: 4 }),
      delta({ id: 'best', declaredVerifiedValue: 8, risk: 1, cost: 1 }),
      delta({ id: 'unauthorized', declaredVerifiedValue: 1000, authorized: false }),
      delta({ id: 'unsafe', declaredVerifiedValue: 1000, constraints: constraints(false) }),
    ],
  });
  assert.equal(result.status, 'SELECTED');
  if (result.status !== 'SELECTED') throw new Error('expected selection');
  assert.equal(result.selectedId, 'best');
  assert.equal(result.execution, 'NOT_STARTED');
  assert.equal(result.evidence, 'DECLARED_SCORES_ONLY');
  assert.deepEqual(result.scored.map((row) => row.id), ['slow', 'best']);
});

test('holds a tie instead of inventing a winner', () => {
  const result = selectBestAuthorizedAction({
    candidates: [
      delta({ id: 'b', declaredVerifiedValue: 4, risk: 1, cost: 1 }),
      delta({ id: 'a', declaredVerifiedValue: 4, risk: 1, cost: 1 }),
    ],
  });
  assert.equal(result.status, 'TIED');
  if (result.status !== 'TIED') throw new Error('expected tie');
  assert.equal(result.selectedId, null);
  assert.deepEqual(result.tiedIds, ['a', 'b']);
});

test('returns none when the authorized set is empty', () => {
  const result = selectBestAuthorizedAction({ candidates: [delta({ id: 'blocked', authorized: false })] });
  assert.equal(result.status, 'NONE_AUTHORIZED');
  if (result.status !== 'NONE_AUTHORIZED') throw new Error('expected none');
  assert.deepEqual(result.tiedIds, []);
  assert.deepEqual(result.scored, []);
});

test('fails closed on malformed candidates and non-positive epsilon', () => {
  const malformed = selectBestAuthorizedAction({
    candidates: [delta({ id: '../x', declaredVerifiedValue: Number.POSITIVE_INFINITY })],
  });
  assert.equal(malformed.status, 'INVALID');
  const epsilon = selectBestAuthorizedAction({ candidates: [], epsilon: 0 });
  assert.equal(epsilon.status, 'INVALID');
});

test('reconciles the next revision label only after verification and attestation', () => {
  const held = reconcileVerifiedImprovement({
    worldId: 'W',
    revision: 't0',
    selectedId: 'best',
    verification: 'UNKNOWN',
    attestationRef: 'att-1',
  });
  assert.equal(held.status, 'HELD');
  assert.equal(held.reason, 'NOT_VERIFIED');
  assert.equal(held.nextRevision, 't0');
  assert.equal(held.claim, 'NO_VERIFIED_CLAIM');

  const unattested = reconcileVerifiedImprovement({
    worldId: 'W',
    revision: 't0',
    selectedId: 'best',
    verification: 'VERIFIED',
    attestationRef: null,
  });
  assert.equal(unattested.reason, 'NOT_ATTESTED');

  const advanced = reconcileVerifiedImprovement({
    worldId: 'W',
    revision: 't0',
    selectedId: 'best',
    verification: 'VERIFIED',
    attestationRef: 'att-1',
  });
  assert.equal(advanced.status, 'ADVANCED');
  if (advanced.status !== 'ADVANCED') throw new Error('expected advance');
  assert.equal(advanced.nextRevision, 't0+1');
  assert.equal(advanced.claim, 'REVISION_LABEL_ONLY');
  assert.equal(advanced.execution, 'NOT_PERFORMED_HERE');
});
