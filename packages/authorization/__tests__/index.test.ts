import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuthorizationEngine } from '../src/index.ts';

const fixedTime = () => '2026-01-01T00:00:00.000Z';

describe('AuthorizationEngine', () => {
  it('denies by default when no grants exist (fail-closed)', () => {
    const engine = new AuthorizationEngine();
    const result = engine.evaluate({
      changeId: 'c1',
      subject: 'agent-1',
      scope: 'oceanicos:test',
      policyRefs: [],
      evidence: ['ev-1'],
    }, fixedTime);
    assert.equal(result.authorized, false);
    assert.equal(result.authorityVerified, false);
    assert.equal(result.policySatisfied, false);
  });

  it('denies when no evidence is supplied', () => {
    const engine = new AuthorizationEngine();
    engine.grant({ subject: 'agent-1', scope: 'oceanicos:*', grantedBy: 'human-1' });
    const result = engine.evaluate({
      changeId: 'c1',
      subject: 'agent-1',
      scope: 'oceanicos:test',
      policyRefs: [],
      evidence: [],
    }, fixedTime);
    assert.equal(result.authorized, false);
    assert.equal(result.reason, 'no evidence supplied');
  });

  it('authorizes when a matching grant exists', () => {
    const engine = new AuthorizationEngine();
    engine.grant({ subject: 'agent-1', scope: 'oceanicos:*', grantedBy: 'human-1' });
    const result = engine.evaluate({
      changeId: 'c1',
      subject: 'agent-1',
      scope: 'oceanicos:worker:test',
      policyRefs: [],
      evidence: ['ev-1'],
    }, fixedTime);
    assert.equal(result.authorized, true);
    assert.equal(result.authorityVerified, true);
    assert.equal(result.policySatisfied, true);
    assert.ok(result.grantId);
  });

  it('denies when subject does not match', () => {
    const engine = new AuthorizationEngine();
    engine.grant({ subject: 'agent-1', scope: 'oceanicos:*', grantedBy: 'human-1' });
    const result = engine.evaluate({
      changeId: 'c1',
      subject: 'agent-2',
      scope: 'oceanicos:test',
      policyRefs: [],
      evidence: ['ev-1'],
    }, fixedTime);
    assert.equal(result.authorized, false);
  });

  it('denies when scope does not match', () => {
    const engine = new AuthorizationEngine();
    engine.grant({ subject: 'agent-1', scope: 'oceanicos:read', grantedBy: 'human-1' });
    const result = engine.evaluate({
      changeId: 'c1',
      subject: 'agent-1',
      scope: 'oceanicos:write',
      policyRefs: [],
      evidence: ['ev-1'],
    }, fixedTime);
    assert.equal(result.authorized, false);
  });

  it('denies when required policies are not satisfied', () => {
    const engine = new AuthorizationEngine();
    engine.grant({ subject: 'agent-1', scope: 'oceanicos:*', policyRefs: ['policy-a'], grantedBy: 'human-1' });
    const result = engine.evaluate({
      changeId: 'c1',
      subject: 'agent-1',
      scope: 'oceanicos:test',
      policyRefs: ['policy-a', 'policy-b'],
      evidence: ['ev-1'],
    }, fixedTime);
    assert.equal(result.authorized, false);
    assert.equal(result.authorityVerified, true);
    assert.equal(result.policySatisfied, false);
  });

  it('authorizes when all required policies are satisfied', () => {
    const engine = new AuthorizationEngine();
    engine.grant({ subject: 'agent-1', scope: 'oceanicos:*', policyRefs: ['policy-a', 'policy-b'], grantedBy: 'human-1' });
    const result = engine.evaluate({
      changeId: 'c1',
      subject: 'agent-1',
      scope: 'oceanicos:test',
      policyRefs: ['policy-a', 'policy-b'],
      evidence: ['ev-1'],
    }, fixedTime);
    assert.equal(result.authorized, true);
    assert.equal(result.policySatisfied, true);
  });

  it('denies after a grant is revoked', () => {
    const engine = new AuthorizationEngine();
    const grant = engine.grant({ subject: 'agent-1', scope: 'oceanicos:*', grantedBy: 'human-1' });
    engine.revoke(grant.id, 'human-1', fixedTime);
    const result = engine.evaluate({
      changeId: 'c1',
      subject: 'agent-1',
      scope: 'oceanicos:test',
      policyRefs: [],
      evidence: ['ev-1'],
    }, fixedTime);
    assert.equal(result.authorized, false);
  });

  it('denies when a grant has expired', () => {
    const engine = new AuthorizationEngine();
    engine.grant({
      subject: 'agent-1',
      scope: 'oceanicos:*',
      grantedBy: 'human-1',
      expiresAt: '2025-01-01T00:00:00.000Z',
    });
    const result = engine.evaluate({
      changeId: 'c1',
      subject: 'agent-1',
      scope: 'oceanicos:test',
      policyRefs: [],
      evidence: ['ev-1'],
    }, fixedTime);
    assert.equal(result.authorized, false);
  });

  it('forbids self-authorization', () => {
    const engine = new AuthorizationEngine();
    assert.throws(
      () => engine.grant({ subject: 'agent-1', scope: 'oceanicos:*', grantedBy: 'agent-1' }),
      /self-authorization is forbidden/,
    );
  });

  it('throws when revoking a nonexistent grant', () => {
    const engine = new AuthorizationEngine();
    assert.throws(() => engine.revoke('nonexistent', 'human-1'), /not found/);
  });

  it('throws when revoking an already-revoked grant', () => {
    const engine = new AuthorizationEngine();
    const grant = engine.grant({ subject: 'agent-1', scope: 'oceanicos:*', grantedBy: 'human-1' });
    engine.revoke(grant.id, 'human-1', fixedTime);
    assert.throws(() => engine.revoke(grant.id, 'human-1', fixedTime), /already revoked/);
  });

  it('tracks active grant count', () => {
    const engine = new AuthorizationEngine();
    const g1 = engine.grant({ subject: 'a', scope: 's', grantedBy: 'h' });
    engine.grant({ subject: 'b', scope: 's', grantedBy: 'h' });
    assert.equal(engine.activeGrantCount, 2);
    engine.revoke(g1.id, 'h', fixedTime);
    assert.equal(engine.activeGrantCount, 1);
  });
});
