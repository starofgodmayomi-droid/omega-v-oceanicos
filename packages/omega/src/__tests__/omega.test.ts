import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OmegaGateRefusal, digestOf, reconcile, requireVerified } from '../index.ts';

describe('@oceanicos/omega — verification gate', () => {
  it('reconciles equal declared values regardless of key order', () => {
    const result = reconcile({ a: 1, b: [2, 3] }, { b: [2, 3], a: 1 });
    assert.equal(result.status, 'VERIFIED');
    assert.equal(result.realityClaimed, false);
    assert.equal(result.scope, 'declared-values');
  });

  it('reports divergence when the declared values differ', () => {
    const result = reconcile({ status: 'ok' }, { status: 'degraded' });
    assert.equal(result.status, 'DIVERGENT');
    assert.notEqual(result.expectedDigest, result.observedDigest);
  });

  it('fails closed and preserves UNKNOWN when a value is missing', () => {
    const result = reconcile({ status: 'ok' }, undefined);
    assert.equal(result.status, 'UNKNOWN');
    assert.deepEqual(result.unknowns, ['OBSERVED_UNKNOWN']);
    assert.equal(result.observedDigest, null);
  });

  it('digestOf returns null for unserializable values', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    assert.equal(digestOf(circular), null);
    assert.equal(digestOf(undefined), null);
  });

  it('requireVerified refuses anything that is not VERIFIED', () => {
    assert.throws(
      () => requireVerified(reconcile(1, 2)),
      (error: unknown) => error instanceof OmegaGateRefusal,
    );
    assert.equal(requireVerified(reconcile(1, 1)).status, 'VERIFIED');
  });
});
