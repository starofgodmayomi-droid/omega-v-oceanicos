import {
  createCovenant,
  validateSanctumAccess,
  transitionCovenant,
  CANONICAL_STEWARD_DID,
} from '../index.js';

describe('@oceanicos/authorization Biblical Engine — Covenant State Machine & Sanctum Trace', () => {
  const baseCovenantParams = {
    covenantId: 'cov-20261014-genesis',
    title: 'Whole-Ecosystem Living Covenant',
    threadId: 'thread-sanctum-001',
    terms: ['Preserve human root', 'Fail closed on uncertainty', 'Truth in love'],
    failClosedCondition: 'EVIDENCE_ABSENCE_OR_BREACH',
  };

  describe('1. Genesis Covenant Creation & Invariant Hash', () => {
    it('creates covenant in PROMISED status with deterministic hash and genesis history', () => {
      const cov = createCovenant(baseCovenantParams);

      expect(cov.status).toBe('PROMISED');
      expect(cov.covenantId).toBe('cov-20261014-genesis');
      expect(cov.attestationHash).toBeNull();
      expect(cov.thread.sanctum).toBe('HOLY_PLACE');
      expect(cov.thread.stewardDid).toBe(CANONICAL_STEWARD_DID);
      expect(cov.thread.covenantStateHash).toHaveLength(64);
      expect(cov.history).toHaveLength(1);
      expect(cov.history[0].toStatus).toBe('PROMISED');
    });
  });

  describe('2. Temple Thread Sanctum Access Validation', () => {
    it('DENYs access to HOLY_OF_HOLIES for anonymous or non-steward entities', () => {
      const result = validateSanctumAccess('HOLY_OF_HOLIES', 'worker:background-01');
      expect(result.allowed).toBe(false);
      expect(result.rationale).toContain('DENY');
    });

    it('DENYs access to HOLY_OF_HOLIES for steward without cryptographic signature', () => {
      const result = validateSanctumAccess('HOLY_OF_HOLIES', CANONICAL_STEWARD_DID, '');
      expect(result.allowed).toBe(false);
      expect(result.rationale).toContain('DENY');
    });

    it('ALLOWs access to HOLY_OF_HOLIES for steward with valid signature', () => {
      const result = validateSanctumAccess(
        'HOLY_OF_HOLIES',
        CANONICAL_STEWARD_DID,
        'sig-ed25519-valid-root-key'
      );
      expect(result.allowed).toBe(true);
      expect(result.rationale).toContain('ALLOW');
    });

    it('ALLOWs access to OUTER_COURT and HOLY_PLACE for operational components', () => {
      const outer = validateSanctumAccess('OUTER_COURT', 'service:fastify-api');
      const holy = validateSanctumAccess('HOLY_PLACE', 'service:policy-engine');
      expect(outer.allowed).toBe(true);
      expect(holy.allowed).toBe(true);
    });
  });

  describe('3. Covenant Lifecycle Transitions (The Wilderness & Fruit Loop)', () => {
    it('DENYs sealing without steward identity or signature', () => {
      const cov = createCovenant(baseCovenantParams);
      const res = transitionCovenant(cov, {
        covenantId: cov.covenantId,
        targetStatus: 'SEALED',
        requestedBy: 'unauthorized-bot',
        reason: 'Attempt unauthorized seal',
        evidenceReceipts: [],
        timestamp: new Date().toISOString(),
      });

      expect(res.success).toBe(false);
      expect(res.previousStatus).toBe('PROMISED');
      expect(res.newStatus).toBe('PROMISED');
      expect(res.error).toBe('UNAUTHORIZED_SEALING_ATTEMPT');
    });

    it('ALLOWs sealing when requested by Canonical Human Steward', () => {
      const cov = createCovenant(baseCovenantParams);
      const res = transitionCovenant(cov, {
        covenantId: cov.covenantId,
        targetStatus: 'SEALED',
        requestedBy: CANONICAL_STEWARD_DID,
        reason: 'Covenant signed by Human Root',
        evidenceReceipts: [],
        timestamp: new Date().toISOString(),
      });

      expect(res.success).toBe(true);
      expect(res.newStatus).toBe('SEALED');
      expect(res.updatedCovenant?.attestationHash).toHaveLength(64);
      expect(res.updatedCovenant?.history).toHaveLength(2);
    });

    it('advances from SEALED to TESTED (Wilderness verification)', () => {
      const cov = createCovenant(baseCovenantParams);
      const sealedRes = transitionCovenant(cov, {
        covenantId: cov.covenantId,
        targetStatus: 'SEALED',
        requestedBy: CANONICAL_STEWARD_DID,
        reason: 'Sealed',
        evidenceReceipts: [],
        timestamp: new Date().toISOString(),
      });

      const sealedCov = sealedRes.updatedCovenant!;
      const testedRes = transitionCovenant(sealedCov, {
        covenantId: sealedCov.covenantId,
        targetStatus: 'TESTED',
        requestedBy: 'operator:ci-runner',
        reason: 'Entering wilderness verification',
        evidenceReceipts: [],
        timestamp: new Date().toISOString(),
      });

      expect(testedRes.success).toBe(true);
      expect(testedRes.newStatus).toBe('TESTED');
    });

    it('DENYs FULFILLED if evidence receipts are empty (Reality-First Invariant)', () => {
      const cov = createCovenant(baseCovenantParams);
      const sealed = transitionCovenant(cov, {
        covenantId: cov.covenantId,
        targetStatus: 'SEALED',
        requestedBy: CANONICAL_STEWARD_DID,
        reason: 'Sealed',
        evidenceReceipts: [],
        timestamp: new Date().toISOString(),
      }).updatedCovenant!;

      const tested = transitionCovenant(sealed, {
        covenantId: sealed.covenantId,
        targetStatus: 'TESTED',
        requestedBy: 'operator:ci-runner',
        reason: 'Tested',
        evidenceReceipts: [],
        timestamp: new Date().toISOString(),
      }).updatedCovenant!;

      const emptyFulfillment = transitionCovenant(tested, {
        covenantId: tested.covenantId,
        targetStatus: 'FULFILLED',
        requestedBy: 'operator:ci-runner',
        reason: 'Claiming fulfillment without proof',
        evidenceReceipts: [], // Empty evidence!
        timestamp: new Date().toISOString(),
      });

      expect(emptyFulfillment.success).toBe(false);
      expect(emptyFulfillment.previousStatus).toBe('TESTED');
      expect(emptyFulfillment.newStatus).toBe('TESTED');
      expect(emptyFulfillment.error).toBe('EVIDENCE_ABSENCE_DENIAL');
    });

    it('ALLOWs FULFILLED when verifiable physical/computational evidence receipts are present', () => {
      const cov = createCovenant(baseCovenantParams);
      const sealed = transitionCovenant(cov, {
        covenantId: cov.covenantId,
        targetStatus: 'SEALED',
        requestedBy: CANONICAL_STEWARD_DID,
        reason: 'Sealed',
        evidenceReceipts: [],
        timestamp: new Date().toISOString(),
      }).updatedCovenant!;

      const tested = transitionCovenant(sealed, {
        covenantId: sealed.covenantId,
        targetStatus: 'TESTED',
        requestedBy: 'operator:ci-runner',
        reason: 'Tested',
        evidenceReceipts: [],
        timestamp: new Date().toISOString(),
      }).updatedCovenant!;

      const fulfilled = transitionCovenant(tested, {
        covenantId: tested.covenantId,
        targetStatus: 'FULFILLED',
        requestedBy: 'operator:ci-runner',
        reason: 'Verified in physical runtime reality',
        evidenceReceipts: ['receipt:jest-test-pass:sha256-4b8c9d', 'receipt:healthcheck:200-ok'],
        timestamp: new Date().toISOString(),
      });

      expect(fulfilled.success).toBe(true);
      expect(fulfilled.newStatus).toBe('FULFILLED');
      expect(fulfilled.updatedCovenant?.evidenceReceipts).toContain('receipt:healthcheck:200-ok');
    });

    it('immediately admits BREACHED to fail-closed state from any status', () => {
      const cov = createCovenant(baseCovenantParams);
      const breached = transitionCovenant(cov, {
        covenantId: cov.covenantId,
        targetStatus: 'BREACHED',
        requestedBy: 'monitor:anomaly-detector',
        reason: 'Autonomous unauthorized action detected in worker lease',
        evidenceReceipts: ['ev:leak-anomaly'],
        timestamp: new Date().toISOString(),
      });

      expect(breached.success).toBe(true);
      expect(breached.newStatus).toBe('BREACHED');
      expect(breached.rationale).toContain('FAIL_CLOSED_ON_EVIDENCE_ABSENCE');
    });

    it('DENYs RESTORED without steward authorization and evidence', () => {
      const cov = createCovenant(baseCovenantParams);
      const breached = transitionCovenant(cov, {
        covenantId: cov.covenantId,
        targetStatus: 'BREACHED',
        requestedBy: 'monitor:anomaly',
        reason: 'Invariant violation',
        evidenceReceipts: [],
        timestamp: new Date().toISOString(),
      }).updatedCovenant!;

      const failedRestore = transitionCovenant(breached, {
        covenantId: breached.covenantId,
        targetStatus: 'RESTORED',
        requestedBy: 'worker:bot',
        reason: 'Attempt self-restore without steward',
        evidenceReceipts: [],
        timestamp: new Date().toISOString(),
      });

      expect(failedRestore.success).toBe(false);
      expect(failedRestore.error).toBe('RESTORATION_UNAUTHORIZED_OR_UNEVIDENCED');
    });

    it('ALLOWs RESTORED when attested by Human Steward with reconciliation evidence', () => {
      const cov = createCovenant(baseCovenantParams);
      const breached = transitionCovenant(cov, {
        covenantId: cov.covenantId,
        targetStatus: 'BREACHED',
        requestedBy: 'monitor:anomaly',
        reason: 'Invariant violation',
        evidenceReceipts: [],
        timestamp: new Date().toISOString(),
      }).updatedCovenant!;

      const restored = transitionCovenant(breached, {
        covenantId: breached.covenantId,
        targetStatus: 'RESTORED',
        requestedBy: CANONICAL_STEWARD_DID,
        reason: 'Reconciled and restored in truth-in-love with root fix',
        evidenceReceipts: ['receipt:reconciliation-delta:patch-applied'],
        timestamp: new Date().toISOString(),
      });

      expect(restored.success).toBe(true);
      expect(restored.newStatus).toBe('RESTORED');
      expect(restored.rationale).toContain('restored and reconciled');
    });

    it('DENYs invalid state hops (e.g. PROMISED directly to FULFILLED)', () => {
      const cov = createCovenant(baseCovenantParams);
      const invalid = transitionCovenant(cov, {
        covenantId: cov.covenantId,
        targetStatus: 'FULFILLED',
        requestedBy: CANONICAL_STEWARD_DID,
        reason: 'Skipping test phase',
        evidenceReceipts: ['receipt:fake'],
        timestamp: new Date().toISOString(),
      });

      expect(invalid.success).toBe(false);
      expect(invalid.error).toBe('INVALID_COVENANT_TRANSITION');
    });
  });
});
