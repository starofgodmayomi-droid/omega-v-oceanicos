import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  reconcile,
  reconcileAll,
  summarizeReconciliation,
} from '../../packages/reconciliation/dist/index.js';
import { ProvenanceChain } from '../../packages/provenance/dist/index.js';
import { AuthorizationEngine } from '../../packages/authorization/dist/index.js';

/**
 * Contract test for the compiled governance surfaces (C6/C7/authorization).
 *
 * The API routes, SDK client, and CLI commands all consume these three
 * packages. This runs against the same `dist` they import, so a build that
 * emits the wrong module format or drops an export fails here rather than at
 * runtime in the dashboard.
 *
 * What this does NOT decide: distributed coordination, persistence of the
 * provenance chain across processes, or deployment health.
 */
describe('Ω∞v governance surfaces', () => {
  describe('C6 reconciliation', () => {
    it('distinguishes VERIFIED, DIVERGENT, and UNKNOWN', () => {
      const verified = reconcile({
        changeId: 'c1',
        expectedState: 'S1',
        observedState: 'S1',
      });
      assert.equal(verified.status, 'VERIFIED');

      const divergent = reconcile({
        changeId: 'c2',
        expectedState: 'S1',
        observedState: 'S0',
      });
      assert.equal(divergent.status, 'DIVERGENT');
      assert.ok(divergent.divergence);

      const unknown = reconcile({ changeId: 'c3', expectedState: 'S1' });
      assert.notEqual(unknown.status, 'VERIFIED');
      assert.ok(['UNKNOWN', 'NOT_EXECUTED'].includes(unknown.status));
    });

    it('summarizes a batch without upgrading unverified results', () => {
      const results = reconcileAll([
        { changeId: 'a', expectedState: 'x', observedState: 'x' },
        { changeId: 'b', expectedState: 'x', observedState: 'y' },
        { changeId: 'c', expectedState: 'x' },
      ]);
      const summary = summarizeReconciliation(results);
      assert.equal(summary.total, 3);
      assert.equal(summary.verified, 1);
      assert.equal(summary.divergent, 1);
      assert.equal(summary.allVerified, false);
    });
  });

  describe('C7 provenance', () => {
    it('links entries by hash and reports lineage', () => {
      const chain = new ProvenanceChain();
      const first = chain.append('c1', 'mini', 'operator-1');
      const second = chain.append('c2', 'mini', null, ['c1']);

      assert.equal(first.sequence, 1);
      assert.equal(second.previousHash, first.hash);
      assert.equal(chain.verifyIntegrity(), true);
      assert.equal(chain.length, 2);
      assert.equal(chain.tip?.changeId, 'c2');

      const lineage = chain.getLineage('c2');
      assert.ok(lineage.includes(second.id));
      assert.ok(lineage.includes('c1'));
    });
  });

  describe('authorization', () => {
    it('fails closed without a matching grant', () => {
      const engine = new AuthorizationEngine();
      const result = engine.evaluate({
        changeId: 'c1',
        subject: 'agent-1',
        scope: 'deploy:prod',
        policyRefs: [],
        evidence: ['attestation-1'],
      });
      assert.equal(result.authorized, false);
      assert.equal(result.authorityVerified, false);
    });

    it('refuses self-authorization', () => {
      const engine = new AuthorizationEngine();
      assert.throws(
        () =>
          engine.grant({
            subject: 'agent-1',
            scope: 'deploy:prod',
            grantedBy: 'agent-1',
          }),
        /self-authorization/
      );
    });

    it('allows a scoped, policy-satisfying grant and denies after revocation', () => {
      const engine = new AuthorizationEngine();
      const grant = engine.grant({
        subject: 'agent-1',
        scope: 'deploy:*',
        policyRefs: ['policy-a'],
        grantedBy: 'operator-1',
      });

      const request = {
        changeId: 'c1',
        subject: 'agent-1',
        scope: 'deploy:prod',
        policyRefs: ['policy-a'],
        evidence: ['attestation-1'],
      };

      const allowed = engine.evaluate(request);
      assert.equal(allowed.authorized, true);
      assert.equal(allowed.authorityVerified, true);
      assert.equal(allowed.policySatisfied, true);

      engine.revoke(grant.id, 'operator-1');

      const denied = engine.evaluate(request);
      assert.equal(denied.authorized, false);
      assert.equal(engine.activeGrantCount, 0);
    });
  });
});
