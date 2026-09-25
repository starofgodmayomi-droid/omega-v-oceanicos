import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  reconcile,
  reconcileWithObserver,
  reconcileAll,
  summarizeReconciliation,
} from '../src/index.ts';

const fixedTime = () => '2026-01-01T00:00:00.000Z';

describe('ReconciliationEngine', () => {
  it('returns VERIFIED when expected equals observed', () => {
    const result = reconcile({
      changeId: 'change-1',
      expectedState: 'state-a',
      observedState: 'state-a',
      now: fixedTime,
    });
    assert.equal(result.status, 'VERIFIED');
    assert.equal(result.observedState, 'state-a');
    assert.equal(result.divergence, undefined);
    assert.ok(result.evidence.startsWith('sha256:'));
  });

  it('returns DIVERGENT when expected differs from observed', () => {
    const result = reconcile({
      changeId: 'change-2',
      expectedState: 'state-a',
      observedState: 'state-b',
      now: fixedTime,
    });
    assert.equal(result.status, 'DIVERGENT');
    assert.ok(result.divergence?.includes('state-a'));
    assert.ok(result.divergence?.includes('state-b'));
  });

  it('returns NOT_EXECUTED when no observed state is supplied', () => {
    const result = reconcile({
      changeId: 'change-3',
      expectedState: 'state-a',
      now: fixedTime,
    });
    assert.equal(result.status, 'NOT_EXECUTED');
    assert.equal(result.observedState, undefined);
  });

  it('returns UNKNOWN when the observer throws', () => {
    const result = reconcileWithObserver({
      changeId: 'change-4',
      expectedState: 'state-a',
      observeState: () => { throw new Error('observation failed'); },
      now: fixedTime,
    });
    assert.equal(result.status, 'UNKNOWN');
    assert.equal(result.observedState, undefined);
  });

  it('returns VERIFIED via observer when observation succeeds', () => {
    const result = reconcileWithObserver({
      changeId: 'change-5',
      expectedState: 'state-a',
      observeState: () => 'state-a',
      now: fixedTime,
    });
    assert.equal(result.status, 'VERIFIED');
  });

  it('reconciles a batch and summarizes correctly', () => {
    const results = reconcileAll([
      { changeId: 'c1', expectedState: 's', observedState: 's', now: fixedTime },
      { changeId: 'c2', expectedState: 's', observedState: 'x', now: fixedTime },
      { changeId: 'c3', expectedState: 's', now: fixedTime },
    ]);
    assert.equal(results.length, 3);
    const summary = summarizeReconciliation(results);
    assert.equal(summary.verified, 1);
    assert.equal(summary.divergent, 1);
    assert.equal(summary.notExecuted, 1);
    assert.equal(summary.allVerified, false);
  });

  it('allVerified is true when every result is VERIFIED', () => {
    const results = reconcileAll([
      { changeId: 'c1', expectedState: 's', observedState: 's', now: fixedTime },
      { changeId: 'c2', expectedState: 's', observedState: 's', now: fixedTime },
    ]);
    assert.equal(summarizeReconciliation(results).allVerified, true);
  });

  it('produces different evidence for different inputs', () => {
    const r1 = reconcile({ changeId: 'c', expectedState: 'a', observedState: 'a', now: fixedTime });
    const r2 = reconcile({ changeId: 'c', expectedState: 'a', observedState: 'b', now: fixedTime });
    assert.notEqual(r1.evidence, r2.evidence);
  });
});
