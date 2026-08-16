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

  /**
   * `recall` guards against non-integer, zero/negative, and out-of-range ids
   * before indexing into the log. Every prior test only ever recalled an id
   * it had just appended, so the guard itself — the `undefined` it returns
   * for an id that was never valid — had no coverage.
   */
  it('returns undefined when recalling an id outside the log range', () => {
    const memory = new Remember();
    memory.append({ type: 'OBSERVATION', data: observation });

    expect(memory.recall(0)).toBeUndefined();
    expect(memory.recall(-1)).toBeUndefined();
    expect(memory.recall(1.5)).toBeUndefined();
    expect(memory.recall(2)).toBeUndefined();
  });

  /**
   * `recallMemory` walks the log backwards looking for a MEMORY entry whose
   * id matches. Every prior test recalled a memory id it had just remembered,
   * so the "searched the whole log and found nothing" fallback had no
   * coverage.
   */
  it('returns undefined when recalling a memory id that was never remembered', () => {
    const memory = new Remember();
    memory.remember(observation, verification);

    expect(memory.recallMemory('mem-does-not-exist')).toBeUndefined();
  });

  /**
   * The memory summary's "verified"/"unverified" wording is picked with a
   * ternary on `verification.summary.passed`. Every prior test used a
   * passing verification, so the summary had only ever said "verified".
   */
  it('summarizes a failed verification as unverified', () => {
    const memory = new Remember();
    const failedVerification: VerificationResult = {
      ...verification,
      summary: { ...verification.summary, passed: false },
    };

    const record = memory.remember(observation, failedVerification);

    expect(record.verified).toBe(false);
    expect(record.summary).toBe('Service healthy → unverified');
  });

  /**
   * `query`'s `filter` parameter defaults to `{}`; every prior call passed
   * an explicit filter object, so the unfiltered, "give me everything"
   * default path had no coverage.
   */
  it('queries with no filter and returns the full log, newest first', () => {
    const memory = new Remember();
    memory.remember(observation, verification);

    const results = memory.query();

    expect(results).toHaveLength(3);
    expect(results[0].type).toBe('MEMORY');
  });
});
