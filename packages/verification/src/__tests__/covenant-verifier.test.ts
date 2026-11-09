import {
  auditCovenantIntegrity,
  CANONICAL_STEWARD_DID,
} from '../index.js';
import type { CovenantRecord } from '@oceanicos/types';

describe('@oceanicos/verification Covenant & Sanctum Integrity Verifier', () => {
  const baseValidCovenant: CovenantRecord = {
    covenantId: 'cov-verified-001',
    title: 'Constitutional Verification Baseline',
    status: 'SEALED',
    thread: {
      threadId: 'thread-001',
      sanctum: 'HOLY_PLACE',
      stewardDid: CANONICAL_STEWARD_DID,
      parentThreadHash: '0'.repeat(64),
      covenantStateHash: 'a'.repeat(64),
      timestamp: new Date().toISOString(),
    },
    terms: ['Term 1: Fail closed', 'Term 2: Reality first'],
    failClosedCondition: 'EVIDENCE_ABSENCE',
    attestationHash: 'b'.repeat(64),
    evidenceReceipts: [],
    history: [],
  };

  it('PASSES audit for a valid SEALED covenant with attestation and valid state hash', () => {
    const report = auditCovenantIntegrity(baseValidCovenant);
    expect(report.verified).toBe(true);
    expect(report.failClosedActive).toBe(false);
    expect(report.violations).toHaveLength(0);
    expect(report.evidenceAudit.validAncestry).toBe(true);
    expect(report.evidenceAudit.hasAttestation).toBe(true);
  });

  it('FAILS audit when FULFILLED covenant lacks evidence receipts (Reality-First)', () => {
    const unevidencedFulfilled: CovenantRecord = {
      ...baseValidCovenant,
      status: 'FULFILLED',
      evidenceReceipts: [], // Empty!
    };

    const report = auditCovenantIntegrity(unevidencedFulfilled);
    expect(report.verified).toBe(false);
    expect(report.failClosedActive).toBe(true);
    expect(report.violations).toContain(
      'VIOLATION: Covenant is marked FULFILLED without empirical evidence receipts'
    );
  });

  it('PASSES audit when FULFILLED covenant possesses valid empirical evidence receipts', () => {
    const validFulfilled: CovenantRecord = {
      ...baseValidCovenant,
      status: 'FULFILLED',
      evidenceReceipts: ['receipt:jest-tests:pass', 'receipt:fastify:healthcheck-200'],
    };

    const report = auditCovenantIntegrity(validFulfilled);
    expect(report.verified).toBe(true);
    expect(report.failClosedActive).toBe(false);
    expect(report.evidenceAudit.receiptCount).toBe(2);
  });

  it('FAILS audit when SEALED covenant has null attestationHash', () => {
    const missingAttestation: CovenantRecord = {
      ...baseValidCovenant,
      status: 'SEALED',
      attestationHash: null,
    };

    const report = auditCovenantIntegrity(missingAttestation);
    expect(report.verified).toBe(false);
    expect(report.failClosedActive).toBe(true);
    expect(report.violations).toContain(
      'VIOLATION: Covenant is SEALED/FULFILLED but lacks cryptographic attestationHash'
    );
  });

  it('FAILS audit when HOLY_OF_HOLIES is bound to non-steward identity', () => {
    const hijackedHolyOfHolies: CovenantRecord = {
      ...baseValidCovenant,
      thread: {
        ...baseValidCovenant.thread,
        sanctum: 'HOLY_OF_HOLIES',
        stewardDid: 'did:omega:agent:rogue-ai',
      },
    };

    const report = auditCovenantIntegrity(hijackedHolyOfHolies);
    expect(report.verified).toBe(false);
    expect(report.failClosedActive).toBe(true);
    expect(report.violations).toContain(
      'VIOLATION: Sanctum HOLY_OF_HOLIES bound to non-steward identity: did:omega:agent:rogue-ai'
    );
  });

  it('FAILS audit when covenant state hash is malformed or corrupted', () => {
    const corruptStateHash: CovenantRecord = {
      ...baseValidCovenant,
      thread: {
        ...baseValidCovenant.thread,
        covenantStateHash: 'short-corrupted-hash',
      },
    };

    const report = auditCovenantIntegrity(corruptStateHash);
    expect(report.verified).toBe(false);
    expect(report.evidenceAudit.validAncestry).toBe(false);
    expect(report.violations).toContain('VIOLATION: Invalid or corrupt covenant state hash');
  });

  it('FAILS audit and triggers active fail-closed when covenant is BREACHED', () => {
    const breachedCov: CovenantRecord = {
      ...baseValidCovenant,
      status: 'BREACHED',
    };

    const report = auditCovenantIntegrity(breachedCov);
    expect(report.verified).toBe(false);
    expect(report.failClosedActive).toBe(true);
    expect(report.violations).toContain('VIOLATION: Covenant is in active BREACHED status');
  });
});
