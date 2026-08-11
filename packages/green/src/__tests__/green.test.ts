import { GreenEngine } from '../index';
import { VerificationResult, EventLogEntry, Attestation } from '@omega-v/types';

describe('GreenEngine (Section XXV GREEN Rule)', () => {
  let engine: GreenEngine;

  beforeEach(() => {
    engine = new GreenEngine();
  });

  const mockVerification: VerificationResult = {
    id: 'ver-123',
    observationId: 'obs-123',
    timestamp: new Date().toISOString(),
    summary: { passed: true, confidence: 1.0, rulesApplied: 1, rulesPassed: 1, rulesFailed: 0 },
    rules: [{ name: 'test-rule', passed: true, confidence: 1.0 }],
    evidencePath: [{ step: 1, rule: 'test-rule', condition: 'x > 0', value: 5, passed: true, reasoning: '5 > 0' }],
    ruleVersions: { 'test-rule': '1.0.0' },
    status: 'completed',
  };

  const mockLineage: EventLogEntry[] = [
    { id: 1, type: 'OBSERVATION', data: { id: 'obs-123' } as any, recordedAt: new Date().toISOString(), hash: 'hash1', previousHash: '0' }
  ];

  const mockAttestation: Attestation = {
    id: 'att-123',
    verificationId: 'ver-123',
    observationId: 'obs-123',
    verified: true,
    confidence: 1.0,
    signature: 'sig',
    signingKey: 'key',
    keyVersion: 'v1',
    signingAlgorithm: 'RS256',
    attestedAt: new Date().toISOString(),
    attestedBy: 'system',
    ruleVersions: {},
    status: 'signed'
  };

  it('should evaluate GREEN correctly when all conditions are met', () => {
    const evaluation = engine.evaluateGreen(mockVerification, true, mockLineage, mockAttestation);
    
    expect(evaluation.isGreen).toBe(true);
    expect(evaluation.allChecksPassed).toBe(true);
    expect(evaluation.evidenceExists).toBe(true);
    expect(evaluation.lineageExists).toBe(true);
    expect(evaluation.attestationExists).toBe(true);
    expect(evaluation.noCriticalFailures).toBe(true);
  });

  it('should fail GREEN if verification failed', () => {
    const failedVer = { ...mockVerification, summary: { ...mockVerification.summary, passed: false } };
    const evaluation = engine.evaluateGreen(failedVer, true, mockLineage, mockAttestation);
    
    expect(evaluation.isGreen).toBe(false);
    expect(evaluation.allChecksPassed).toBe(false);
    expect(evaluation.reason).toContain('Not all required verification checks passed');
  });

  it('should fail GREEN if evidence artifact is missing', () => {
    const evaluation = engine.evaluateGreen(mockVerification, false, mockLineage, mockAttestation);
    
    expect(evaluation.isGreen).toBe(false);
    expect(evaluation.evidenceExists).toBe(false);
    expect(evaluation.reason).toContain('Evidence artifact does not exist');
  });

  it('should fail GREEN if lineage is broken (observation missing)', () => {
    const evaluation = engine.evaluateGreen(mockVerification, true, [], mockAttestation);
    
    expect(evaluation.isGreen).toBe(false);
    expect(evaluation.lineageExists).toBe(false);
    expect(evaluation.reason).toContain('lineage');
  });

  it('should fail GREEN if attestation is missing or invalid', () => {
    const evaluation = engine.evaluateGreen(mockVerification, true, mockLineage, undefined);
    
    expect(evaluation.isGreen).toBe(false);
    expect(evaluation.attestationExists).toBe(false);
    expect(evaluation.reason).toContain('attestation');
  });

  it('should fail GREEN if there is a hidden critical failure in evidence', () => {
    const criticalVer = { 
      ...mockVerification, 
      evidencePath: [
        ...mockVerification.evidencePath, 
        { step: 2, rule: 'sec', condition: 'no-vuln', value: 'CVE-123', passed: false, severity: 'critical', reasoning: 'vuln' as any }
      ] 
    };
    const evaluation = engine.evaluateGreen(criticalVer, true, mockLineage, mockAttestation);
    
    expect(evaluation.isGreen).toBe(false);
    expect(evaluation.noCriticalFailures).toBe(false);
    expect(evaluation.reason).toContain('Hidden critical failure');
  });
});
