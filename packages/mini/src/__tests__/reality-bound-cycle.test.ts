import { describe, expect, it } from '@jest/globals';
import { OceanicosRealityMatrix, type OmegaCycleInput, type OmegaExecutionReceipt, type OmegaObservation } from '../reality-bound-cycle.js';

const base: OmegaCycleInput = {
  g: 'LIVING',
  f: 'HUMAN',
  m: 1,
  s: 'PLANET',
  evidence: true,
  evidenceId: 'evidence:test-fixture',
  authority: true,
  authorityId: 'authority:test-fixture',
  policyId: 'policy:test-fixture',
  bounded: true,
};

const receipt: OmegaExecutionReceipt = {
  id: 'execution:test-001',
  transactionId: 'tx:test-001',
  source: 'controlled-test-fixture',
  recordedAt: '2026-10-08T12:00:00.000Z',
};

const matchingObservation: OmegaObservation = {
  id: 'observation:test-match',
  source: 'controlled-test-fixture',
  recordedAt: '2026-10-08T12:00:01.000Z',
  evidenceId: 'observation-evidence:test-match',
  expectedMatchesActual: true,
};

describe('Ω∞v reality-bound core matrix', () => {
  it('fails closed on missing evidence', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({ ...base, evidence: false });
    expect(result.decision).toBe('DENY');
    expect(result.route).toBe(0);
    expect(result.execution).toBe('NOT_EXECUTED');
    expect(result.verification).toBe('NOT_EXECUTED');
    expect(result.reason).toBe('MISSING_EVIDENCE');
    expect(engine.verifyLedger()).toBe(true);
  });

  it('fails closed on missing authority', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({ ...base, authority: false });
    expect(result.decision).toBe('DENY');
    expect(result.route).toBe(0);
    expect(result.execution).toBe('NOT_EXECUTED');
  });

  it('fails closed on missing evidence reference', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({ ...base, evidenceId: '' });
    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe('MISSING_EVIDENCE_REFERENCE');
  });

  it('fails closed on missing policy reference', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({ ...base, policyId: '' });
    expect(result.decision).toBe('DENY');
    expect(result.reason).toBe('MISSING_POLICY_REFERENCE');
  });

  it('fails closed on an unbounded transition', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({ ...base, bounded: false });
    expect(result.decision).toBe('DENY');
    expect(result.route).toBe(0);
    expect(result.execution).toBe('NOT_EXECUTED');
  });

  it('does not confuse admission with execution when no executor receipt exists', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({ ...base });
    expect(result.decision).toBe('ALLOW');
    expect(result.route).toBe(1);
    expect(result.execution).toBe('UNCONFIRMED');
    expect(result.verification).toBe('UNKNOWN');
    expect(result.tx).toBeUndefined();
    expect(result.observationId).toBeUndefined();
    expect(result.reason).toBe('NO_EXECUTION_RECEIPT');
    expect(engine.verifyLedger()).toBe(true);
  });

  it('preserves UNKNOWN when execution is evidenced but observation is absent', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({ ...base, executionReceipt: receipt });
    expect(result.execution).toBe('EXECUTED');
    expect(result.verification).toBe('UNKNOWN');
    expect(result.tx).toBe('tx:test-001');
    expect(result.observationId).toBeUndefined();
    expect(result.reason).toBe('NO_OBSERVATION');
  });

  it('does not invent an observation ID or treat an incomplete observation as VERIFIED', () => {
    const engine = new OceanicosRealityMatrix();
    const incomplete: OmegaObservation = {
      id: 'observation:test-incomplete',
      source: 'controlled-test-fixture',
      recordedAt: '2026-10-08T12:00:01.000Z',
      evidenceId: 'observation-evidence:test-incomplete',
    };
    const result = engine.cycle({
      ...base,
      executionReceipt: receipt,
      observation: incomplete,
    });
    expect(result.execution).toBe('EXECUTED');
    expect(result.verification).toBe('UNKNOWN');
    expect(result.observationId).toBe('observation:test-incomplete');
    expect(result.reason).toBe('OBSERVATION_HAS_NO_COMPARISON');
  });

  it('marks VERIFIED only when valid observation evidence supports a match', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({
      ...base,
      executionReceipt: receipt,
      observation: matchingObservation,
    });
    expect(result.decision).toBe('ALLOW');
    expect(result.execution).toBe('EXECUTED');
    expect(result.verification).toBe('VERIFIED');
    expect(result.tx).toBe('tx:test-001');
    expect(result.observationId).toBe('observation:test-match');
    expect(result.reason).toBeUndefined();
    expect(engine.verifyLedger()).toBe(true);
  });

  it('preserves DIVERGENT when observation disagrees with expectation', () => {
    const engine = new OceanicosRealityMatrix();
    const observation: OmegaObservation = {
      ...matchingObservation,
      id: 'observation:test-divergent',
      expectedMatchesActual: false,
    };
    const result = engine.cycle({
      ...base,
      executionReceipt: receipt,
      observation,
    });
    expect(result.execution).toBe('EXECUTED');
    expect(result.verification).toBe('DIVERGENT');
  });

  it('does not treat an invalid execution receipt as proof that execution occurred', () => {
    const engine = new OceanicosRealityMatrix();
    const result = engine.cycle({
      ...base,
      executionReceipt: { ...receipt, recordedAt: 'not-a-time' },
      observation: matchingObservation,
    });
    expect(result.decision).toBe('ALLOW');
    expect(result.execution).toBe('UNCONFIRMED');
    expect(result.verification).toBe('UNKNOWN');
    expect(result.reason).toBe('INVALID_EXECUTION_RECEIPT');
    expect(result.tx).toBeUndefined();
  });

  it('keeps the append-only ledger hash chain valid across denied, unconfirmed, and evidenced events', () => {
    const engine = new OceanicosRealityMatrix();
    engine.cycle({ ...base, evidence: false });
    engine.cycle({ ...base });
    engine.cycle({ ...base, executionReceipt: receipt, observation: matchingObservation });
    expect(engine.ledger()).toHaveLength(3);
    expect(engine.verifyLedger()).toBe(true);
  });
});
