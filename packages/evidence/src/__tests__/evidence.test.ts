import { EvidenceEngine } from '../index';
import { VerificationResult, EventLogEntry } from '@omega-v/types';

describe('EvidenceEngine (Section XXIV Evidence Artifacts)', () => {
  let engine: EvidenceEngine;

  beforeEach(() => {
    engine = new EvidenceEngine();
  });

  const mockVerification: VerificationResult = {
    id: 'ver-123',
    observationId: 'obs-123',
    timestamp: new Date().toISOString(),
    summary: { passed: true, confidence: 1.0, rulesApplied: 1, rulesPassed: 1, rulesFailed: 0 },
    rules: [{ name: 'test-rule', passed: true, confidence: 1.0 }],
    evidencePath: [
      {
        step: 1,
        rule: 'test-rule',
        condition: 'x > 0',
        value: 5,
        passed: true,
        reasoning: '5 > 0',
      },
    ],
    ruleVersions: { 'test-rule': '1.0.0' },
    status: 'completed',
  };

  const mockEvents: EventLogEntry[] = [
    {
      id: 1,
      type: 'OBSERVATION',
      data: {} as any,
      recordedAt: new Date().toISOString(),
      hash: 'hash1',
      previousHash: '0',
    },
    {
      id: 2,
      type: 'VERIFICATION',
      data: mockVerification,
      recordedAt: new Date().toISOString(),
      hash: 'hash2',
      previousHash: 'hash1',
    },
  ];

  it('should generate an evidence artifact', () => {
    const artifact = engine.generateArtifact(mockVerification, mockEvents, 'production', {
      '@omega-v/core': '1.0.0',
    });
    expect(artifact.id).toContain('evd-');
    expect(artifact.verificationId).toBe('ver-123');
    expect(artifact.environment).toBe('production');
    expect(artifact.payload.evidencePath).toHaveLength(1);
  });

  it('should verify lineage integrity correctly', () => {
    const artifact = engine.generateArtifact(mockVerification, mockEvents, 'production', {
      '@omega-v/core': '1.0.0',
    });

    // Integrity check against same events should pass
    expect(engine.verifyIntegrity(artifact, mockEvents)).toBe(true);

    // Integrity check against modified events should fail
    const tamperedEvents = [
      ...mockEvents,
      {
        id: 3,
        type: 'ATTESTATION',
        data: {} as any,
        recordedAt: new Date().toISOString(),
        hash: 'hash3',
        previousHash: 'hash2',
      } as EventLogEntry,
    ];
    expect(engine.verifyIntegrity(artifact, tamperedEvents)).toBe(false);
  });
});
