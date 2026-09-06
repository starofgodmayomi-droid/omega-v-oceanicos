import { MiniKernel } from '../index';
import { VerificationRule } from '@omega-v/types';

const DEFAULT_RULE: VerificationRule = {
  name: 'response-time-threshold',
  version: '1.0.0',
  appliesTo: ['mini-cycle'],
  definition: 'responseTime < 100',
  description: 'Test rule for mini kernel',
  createdAt: new Date().toISOString(),
  active: true,
};

describe('MiniKernel', () => {
  let kernel: MiniKernel;

  beforeEach(() => {
    kernel = new MiniKernel({ rules: [DEFAULT_RULE] });
  });

  test('cycle produces a complete MiniCycleResult', () => {
    const result = kernel.cycle({
      claim: 'System health is nominal',
      metadata: { responseTime: 42 },
    });

    expect(result.observation).toBeDefined();
    expect(result.observation.claim.statement).toBe('System health is nominal');
    expect(result.verification).toBeDefined();
    expect(result.memory).toBeDefined();
    expect(result.entries).toBeDefined();
    expect(result.entries).toHaveLength(3);
    expect(result.entries![1].previousHash).toBe(result.entries![0].hash);
    expect(result.entries![2].previousHash).toBe(result.entries![1].hash);
    expect(result.passed).toBe(true);
    expect(result.confidence).toBeDefined();
    expect(result.completedAt).toBeDefined();
  });

  test('cycle with failing verification returns passed=false', () => {
    const result = kernel.cycle({
      claim: 'System is slow',
      metadata: { responseTime: 500 }, // exceeds 100ms threshold
    });

    expect(result.passed).toBe(false);
    expect(result.verification.summary.rulesFailed).toBeGreaterThan(0);
  });

  test('observe returns a normalized Observation', () => {
    const obs = kernel.observe({
      claim: 'Direct observation test',
      confidence: 0.85,
      confidenceReason: 'Manual test',
    });

    expect(obs.id).toBeDefined();
    expect(obs.claim.statement).toBe('Direct observation test');
    expect(obs.status).toBe('normalized');
  });

  test('verify returns a VerificationResult', () => {
    const obs = kernel.observe({
      claim: 'Verify test',
      metadata: { responseTime: 10 },
    });
    const ver = kernel.verify(obs);

    expect(ver.id).toBeDefined();
    expect(ver.observationId).toBe(obs.id);
    expect(ver.summary).toBeDefined();
  });

  test('verifyMemoryIntegrity returns true on valid chain', () => {
    kernel.cycle({ claim: 'Integrity test', metadata: { responseTime: 20 } });
    expect(kernel.verifyMemoryIntegrity()).toBe(true);
  });

  test('getMemorySize reflects remembered entries', () => {
    expect(kernel.getMemorySize()).toBe(0);
    kernel.cycle({ claim: 'First cycle', metadata: { responseTime: 20 } });
    expect(kernel.getMemorySize()).toBe(3); // OBS + VER + MEMORY
    kernel.cycle({ claim: 'Second cycle', metadata: { responseTime: 30 } });
    expect(kernel.getMemorySize()).toBe(6);
  });

  test('recallMemory retrieves a stored MemoryRecord', () => {
    const result = kernel.cycle({ claim: 'Recall test', metadata: { responseTime: 20 } });
    const recalled = kernel.recallMemory(result.memory.id);

    expect(recalled).toBeDefined();
    expect(recalled!.id).toBe(result.memory.id);
    expect(recalled!.verified).toBe(result.passed);
  });

  test('recallMemory returns undefined for unknown id', () => {
    expect(kernel.recallMemory('nonexistent-id')).toBeUndefined();
  });

  test('multiple cycles maintain hash chain integrity', () => {
    for (let i = 0; i < 10; i++) {
      kernel.cycle({ claim: `Cycle ${i}`, metadata: { responseTime: i * 5 } });
    }
    expect(kernel.verifyMemoryIntegrity()).toBe(true);
    expect(kernel.getMemorySize()).toBe(30); // 10 × 3
  });

  test('getObserver, getVerificationEngine, getMemory return instances', () => {
    expect(kernel.getObserver()).toBeDefined();
    expect(kernel.getVerificationEngine()).toBeDefined();
    expect(kernel.getMemory()).toBeDefined();
  });

  test('constructs with default instances when no options provided', () => {
    const defaultKernel = new MiniKernel();
    const obs = defaultKernel.observe({ claim: 'default test', confidence: 0.5, confidenceReason: 'test' });
    expect(obs.id).toBeDefined();
  });
});
