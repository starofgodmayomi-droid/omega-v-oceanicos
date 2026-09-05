import { Remember } from '../index';
import { Observation, VerificationResult } from '@omega-v/types';

function makeObservation(id: string, claim: string): Observation {
  return {
    id,
    claim: { statement: claim, category: 'test' },
    source: { system: 'test', version: '1.0.0', environment: 'test' },
    timestamp: new Date().toISOString(),
    observedBy: 'test-runner',
    metadata: {},
    confidence: 0.9,
    confidenceReason: 'test',
    status: 'normalized',
  };
}

function makeVerification(id: string, observationId: string, passed: boolean): VerificationResult {
  return {
    id,
    observationId,
    timestamp: new Date().toISOString(),
    summary: {
      passed,
      confidence: passed ? 0.95 : 0.3,
      rulesApplied: 1,
      rulesPassed: passed ? 1 : 0,
      rulesFailed: passed ? 0 : 1,
    },
    rules: [{ name: 'test-rule', passed, confidence: 0.95 }],
    evidencePath: [],
    ruleVersions: { 'test-rule': '1.0.0' },
    status: 'completed',
  };
}

describe('Remember', () => {
  let memory: Remember;

  beforeEach(() => {
    memory = new Remember();
  });

  test('starts with empty state', () => {
    expect(memory.size()).toBe(0);
    expect(memory.all()).toHaveLength(0);
    expect(memory.verifyIntegrity()).toBe(true);
  });

  test('append adds an entry to the log', () => {
    const obs = makeObservation('obs-1', 'test claim');
    const entry = memory.append({ type: 'OBSERVATION', data: obs });

    expect(entry.id).toBe(1);
    expect(entry.type).toBe('OBSERVATION');
    expect(entry.hash).toBeDefined();
    expect(entry.previousHash).toBeDefined();
    expect(memory.size()).toBe(1);
  });

  test('remember creates a MemoryRecord with three log entries', () => {
    const obs = makeObservation('obs-1', 'Water is wet');
    const ver = makeVerification('ver-1', 'obs-1', true);

    const mem = memory.remember(obs, ver);

    expect(mem.observationId).toBe('obs-1');
    expect(mem.verificationId).toBe('ver-1');
    expect(mem.verified).toBe(true);
    expect(mem.summary).toContain('Water is wet');
    expect(mem.summary).toContain('verified');
    expect(memory.size()).toBe(3); // OBS + VER + MEMORY
  });

  test('remember with failed verification stores unverified summary', () => {
    const obs = makeObservation('obs-2', 'Fire is cold');
    const ver = makeVerification('ver-2', 'obs-2', false);

    const mem = memory.remember(obs, ver);

    expect(mem.verified).toBe(false);
    expect(mem.summary).toContain('unverified');
  });

  test('recall returns entry by sequential id', () => {
    const obs = makeObservation('obs-1', 'test');
    memory.append({ type: 'OBSERVATION', data: obs });

    expect(memory.recall(1)).toBeDefined();
    expect(memory.recall(1)!.type).toBe('OBSERVATION');
    expect(memory.recall(2)).toBeUndefined();
    expect(memory.recall(0)).toBeUndefined();
    expect(memory.recall(-1)).toBeUndefined();
  });

  test('recallMemory finds a MemoryRecord by memory id', () => {
    const obs = makeObservation('obs-1', 'test');
    const ver = makeVerification('ver-1', 'obs-1', true);

    const mem = memory.remember(obs, ver);
    const recalled = memory.recallMemory(mem.id);

    expect(recalled).toBeDefined();
    expect(recalled!.id).toBe(mem.id);
    expect(recalled!.verified).toBe(true);
  });

  test('recallMemory returns undefined for unknown id', () => {
    expect(memory.recallMemory('nonexistent')).toBeUndefined();
  });

  test('query returns results filtered by type', () => {
    const obs = makeObservation('obs-1', 'test');
    const ver = makeVerification('ver-1', 'obs-1', true);
    memory.remember(obs, ver);

    const observations = memory.query({ type: 'OBSERVATION' });
    expect(observations).toHaveLength(1);

    const memories = memory.query({ type: 'MEMORY' });
    expect(memories).toHaveLength(1);
  });

  test('query results are newest-first', () => {
    const obs1 = makeObservation('obs-1', 'first');
    const obs2 = makeObservation('obs-2', 'second');
    memory.append({ type: 'OBSERVATION', data: obs1 });
    memory.append({ type: 'OBSERVATION', data: obs2 });

    const results = memory.query({ type: 'OBSERVATION' });
    expect(results[0].id).toBe(2); // newest first
    expect(results[1].id).toBe(1);
  });

  test('query respects limit', () => {
    const obs1 = makeObservation('obs-1', 'first');
    const obs2 = makeObservation('obs-2', 'second');
    memory.append({ type: 'OBSERVATION', data: obs1 });
    memory.append({ type: 'OBSERVATION', data: obs2 });

    const results = memory.query({ limit: 1 });
    expect(results).toHaveLength(1);
  });

  test('verifyIntegrity detects a valid chain', () => {
    const obs = makeObservation('obs-1', 'test');
    const ver = makeVerification('ver-1', 'obs-1', true);
    memory.remember(obs, ver);

    expect(memory.verifyIntegrity()).toBe(true);
  });

  test('hash chain links entries together', () => {
    const obs1 = makeObservation('obs-1', 'first');
    const obs2 = makeObservation('obs-2', 'second');
    memory.append({ type: 'OBSERVATION', data: obs1 });
    memory.append({ type: 'OBSERVATION', data: obs2 });

    const entries = memory.all();
    expect(entries[1].previousHash).toBe(entries[0].hash);
  });

  test('multiple remember cycles maintain chain integrity', () => {
    for (let i = 0; i < 5; i++) {
      const obs = makeObservation(`obs-${i}`, `claim ${i}`);
      const ver = makeVerification(`ver-${i}`, `obs-${i}`, true);
      memory.remember(obs, ver);
    }

    expect(memory.size()).toBe(15); // 5 cycles × 3 entries
    expect(memory.verifyIntegrity()).toBe(true);
  });
});
