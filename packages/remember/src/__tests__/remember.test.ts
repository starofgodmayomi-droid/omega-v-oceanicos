import { Remember } from '../index';
import { Observation, VerificationResult } from '@omega-v/types';

const observation: Observation = {
  id: 'obs-test-1',
  claim: { statement: 'Service healthy', category: 'health-check' },
  source: { system: 'test', version: '1.0.0', environment: 'test' },
  timestamp: '2026-08-14T12:00:00.000Z',
  observedBy: 'tester',
  metadata: { statusCode: 200 },
  confidence: 0.95,
  confidenceReason: 'unit test',
  status: 'normalized',
};

const verification: VerificationResult = {
  id: 'ver-test-1',
  observationId: 'obs-test-1',
  timestamp: '2026-08-14T12:00:01.000Z',
  summary: {
    passed: true,
    confidence: 0.95,
    rulesApplied: 1,
    rulesPassed: 1,
    rulesFailed: 0,
  },
  rules: [{ name: 'status-code-check', passed: true, confidence: 0.95 }],
  evidencePath: [],
  ruleVersions: { 'status-code-check': '1.0.0' },
  status: 'completed',
};

describe('Remember', () => {
  it('stores observation, verification, and memory as a chain', () => {
    const memory = new Remember();
    const record = memory.remember(observation, verification);

    expect(record.observationId).toBe(observation.id);
    expect(record.verificationId).toBe(verification.id);
    expect(record.verified).toBe(true);
    expect(memory.size()).toBe(3);
    expect(memory.verifyIntegrity()).toBe(true);
  });

  it('recalls memory by id and supports queries', () => {
    const memory = new Remember();
    const record = memory.remember(observation, verification);

    expect(memory.recallMemory(record.id)?.id).toBe(record.id);
    expect(memory.query({ type: 'MEMORY' })).toHaveLength(1);
    expect(memory.query({ observationId: observation.id })).toHaveLength(3);
    expect(memory.query({ verificationId: verification.id, limit: 1 })).toHaveLength(1);
  });

  it('detects tampering in the hash chain', () => {
    const memory = new Remember();
    memory.remember(observation, verification);

    const entries = memory.all() as Array<{ hash: string }>;
    entries[0].hash = 'tampered';

    expect(memory.verifyIntegrity()).toBe(false);
  });

  it('appends arbitrary rememberable entries', () => {
    const memory = new Remember();
    const entry = memory.append({ type: 'OBSERVATION', data: observation });

    expect(entry.id).toBe(1);
    expect(memory.recall(1)?.type).toBe('OBSERVATION');
    expect(memory.verifyIntegrity()).toBe(true);
  });
});
