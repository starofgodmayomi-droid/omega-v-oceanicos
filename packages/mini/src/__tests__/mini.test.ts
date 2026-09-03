import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MiniKernel } from '../index';
import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { Remember, FileMemoryStore } from '@omega-v/remember';
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

describe('MiniKernel — composition surface', () => {
  const input = {
    claim: 'Service X is healthy',
    category: 'health-check',
    source: { system: 'health-check-api', version: '1.0.0', environment: 'test' },
    observedBy: 'mini-test',
    metadata: { statusCode: 200, responseTime: 42 },
    confidence: 0.95,
    confidenceReason: 'unit test',
  };

  it('registers a rule after construction', () => {
    const mini = new MiniKernel();
    expect(mini.verification.getRuleCount()).toBe(0);

    mini.registerRule(healthRule);

    expect(mini.verification.getRuleCount()).toBe(1);
    expect(mini.cycle(input).verification.summary.rulesApplied).toBe(1);
  });

  it('observes without verifying or remembering', () => {
    const mini = new MiniKernel({ rules: [healthRule] });

    const observation = mini.observe(input);

    expect(observation.status).toBe('normalized');
    expect(observation.claim.statement).toBe('Service X is healthy');
    expect(mini.memory.size()).toBe(0);
  });

  it('verifies a previously observed claim without remembering it', () => {
    const mini = new MiniKernel({ rules: [healthRule] });
    const observation = mini.observe(input);

    const verification = mini.verify(observation);

    expect(verification.summary.passed).toBe(true);
    expect(verification.observationId).toBe(observation.id);
    expect(mini.memory.size()).toBe(0);
  });

  it('uses injected components instead of constructing its own', () => {
    const observer = new Observer();
    const verification = new VerificationEngine();
    const memory = new Remember();
    verification.registerRule(healthRule);

    const mini = new MiniKernel({ observer, verification, memory });

    expect(mini.observer).toBe(observer);
    expect(mini.verification).toBe(verification);
    expect(mini.memory).toBe(memory);

    mini.cycle(input);
    expect(memory.size()).toBe(3);
  });

  it('returns only the entries the cycle added, across repeated cycles', () => {
    const mini = new MiniKernel({ rules: [healthRule] });

    const first = mini.cycle(input);
    const second = mini.cycle({ ...input, claim: 'Service Y is healthy' });

    expect(first.entries).toHaveLength(3);
    expect(second.entries).toHaveLength(3);
    expect(mini.memory.size()).toBe(6);
    expect(second.entries[0].id).toBe(4);
    expect(mini.verifyMemoryIntegrity()).toBe(true);
  });
});

describe('MiniKernel — durable memory', () => {
  const input = {
    claim: 'Service X is healthy',
    category: 'health-check',
    source: { system: 'health-check-api', version: '1.0.0', environment: 'test' },
    observedBy: 'mini-test',
    metadata: { statusCode: 200, responseTime: 42 },
    confidence: 0.95,
    confidenceReason: 'unit test',
  };

  it('resumes a verified chain after the kernel is rebuilt', () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-mini-'));
    const path = join(directory, 'chain.jsonl');

    const first = new MiniKernel({
      rules: [healthRule],
      memory: new Remember(new FileMemoryStore(path)),
    });
    first.cycle(input);
    expect(first.memory.size()).toBe(3);

    const restarted = new MiniKernel({
      rules: [healthRule],
      memory: new Remember(new FileMemoryStore(path)),
    });

    expect(restarted.memory.size()).toBe(3);
    expect(restarted.verifyMemoryIntegrity()).toBe(true);

    const next = restarted.cycle({ ...input, claim: 'Service X still healthy' });

    expect(next.entries[0].id).toBe(4);
    expect(restarted.memory.size()).toBe(6);
    expect(restarted.verifyMemoryIntegrity()).toBe(true);
  });
});
