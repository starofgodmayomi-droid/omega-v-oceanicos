import { MiniKernel } from '../index';
import { VerificationRule } from '@omega-v/types';

const healthRule: VerificationRule = {
  name: 'status-code-check',
  version: '1.0.0',
  appliesTo: ['health-check'],
  definition: 'statusCode === 200',
  description: 'HTTP status must be 200',
  createdAt: '2026-08-14T00:00:00.000Z',
  active: true,
};

const responseTimeRule: VerificationRule = {
  name: 'response-time-threshold',
  version: '1.0.0',
  appliesTo: ['health-check'],
  definition: 'responseTime < 100',
  description: 'Response time under 100ms',
  createdAt: '2026-08-14T00:00:00.000Z',
  active: true,
};

describe('MiniKernel', () => {
  it('runs Observe → Verify → Remember as one cycle', () => {
    const mini = new MiniKernel({ rules: [healthRule, responseTimeRule] });

    const result = mini.cycle({
      claim: 'Service X is healthy',
      category: 'health-check',
      source: {
        system: 'health-check-api',
        version: '1.0.0',
        environment: 'test',
      },
      observedBy: 'mini-test',
      metadata: {
        statusCode: 200,
        responseTime: 42,
      },
      confidence: 0.95,
      confidenceReason: 'unit test',
    });

    expect(result.observation.status).toBe('normalized');
    expect(result.verification.summary.passed).toBe(true);
    expect(result.verification.summary.rulesApplied).toBe(2);
    expect(result.memory.verified).toBe(true);
    expect(result.memory.observationId).toBe(result.observation.id);
    expect(result.entries).toHaveLength(3);
    expect(mini.verifyMemoryIntegrity()).toBe(true);
  });

  it('remembers failed verification without pretending success', () => {
    const mini = new MiniKernel({ rules: [responseTimeRule] });

    const result = mini.cycle({
      claim: 'Service is fast',
      category: 'health-check',
      source: {
        system: 'health-check-api',
        version: '1.0.0',
        environment: 'test',
      },
      observedBy: 'mini-test',
      metadata: {
        responseTime: 250,
      },
      confidence: 0.8,
      confidenceReason: 'slow response fixture',
    });

    expect(result.verification.summary.passed).toBe(false);
    expect(result.memory.verified).toBe(false);
    expect(mini.memory.size()).toBe(3);
  });

  it('starts from zero with empty memory', () => {
    const mini = new MiniKernel();
    expect(mini.memory.size()).toBe(0);
    expect(mini.verifyMemoryIntegrity()).toBe(true);
  });
});
