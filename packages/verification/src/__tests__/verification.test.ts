import { VerificationEngine } from '../index';
import { Observation, VerificationRule } from '@omega-v/types';

const rule = (over: Partial<VerificationRule> = {}): VerificationRule => ({
  name: 'status-code-check',
  version: '1.0.0',
  appliesTo: ['http'],
  definition: 'statusCode === 200',
  description: 'Checks the HTTP status code',
  createdAt: '2026-08-14T00:00:00.000Z',
  active: true,
  ...over,
});

const observation = (metadata: Record<string, unknown> = {}, category = 'http'): Observation => ({
  id: `obs-${Math.random().toString(36).slice(2)}`,
  claim: { statement: 'service responded', category },
  source: { system: 'test', version: '0.1.0', environment: 'test' },
  timestamp: '2026-08-14T00:00:00.000Z',
  observedBy: 'verification-test',
  metadata,
  confidence: 0.9,
  confidenceReason: 'fixture',
  status: 'normalized',
});

describe('VerificationEngine — rule registry', () => {
  it('registers rules and reports the count', () => {
    const engine = new VerificationEngine();
    expect(engine.getRuleCount()).toBe(0);

    engine.registerRule(rule());
    engine.registerRule(rule({ name: 'response-time-threshold' }));
    expect(engine.getRuleCount()).toBe(2);
  });

  it('treats name+version as the registry key, so re-registering replaces', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());
    engine.registerRule(rule({ description: 'updated' }));
    expect(engine.getRuleCount()).toBe(1);

    engine.registerRule(rule({ version: '2.0.0' }));
    expect(engine.getRuleCount()).toBe(2);
  });

  it('selects only active rules whose category matches the observation', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());
    engine.registerRule(rule({ name: 'inactive-rule', active: false }));
    engine.registerRule(rule({ name: 'other-category', appliesTo: ['grpc'] }));

    const applicable = engine.getApplicableRules(observation({ statusCode: 200 }));
    expect(applicable.map((r) => r.name)).toEqual(['status-code-check']);
  });
});

describe('VerificationEngine — status-code-check', () => {
  it('passes and records evidence when the status code matches', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());

    const result = engine.verify(observation({ statusCode: 200 }));

    expect(result.summary.passed).toBe(true);
    expect(result.summary.rulesApplied).toBe(1);
    expect(result.summary.rulesPassed).toBe(1);
    expect(result.summary.rulesFailed).toBe(0);
    expect(result.status).toBe('completed');
    expect(result.ruleVersions).toEqual({ 'status-code-check': '1.0.0' });
    expect(result.evidencePath).toHaveLength(1);
    expect(result.evidencePath[0]).toMatchObject({
      step: 1,
      rule: 'status-code-check',
      value: 200,
      expected: 200,
      passed: true,
    });
    expect(result.evidencePath[0].severity).toBeUndefined();
  });

  it('fails with critical severity when the status code differs', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());

    const result = engine.verify(observation({ statusCode: 500 }));

    expect(result.summary.passed).toBe(false);
    expect(result.summary.rulesFailed).toBe(1);
    expect(result.evidencePath[0].severity).toBe('critical');
    expect(result.rules[0].confidence).toBeCloseTo(0.1);
  });

  it('defaults a missing status code to 0 and fails', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());

    const result = engine.verify(observation({}));

    expect(result.evidencePath[0].value).toBe(0);
    expect(result.summary.passed).toBe(false);
  });
});

describe('VerificationEngine — response-time-threshold', () => {
  const timing = rule({ name: 'response-time-threshold', appliesTo: ['perf'] });

  it('passes below the threshold', () => {
    const engine = new VerificationEngine();
    engine.registerRule(timing);

    const result = engine.verify(observation({ responseTime: 40 }, 'perf'));

    expect(result.summary.passed).toBe(true);
    expect(result.rules[0].confidence).toBeCloseTo(0.95);
    expect(result.evidencePath[0].reasoning).toContain('below');
    expect(result.evidencePath[0].severity).toBeUndefined();
  });

  it('fails above the threshold with a warning', () => {
    const engine = new VerificationEngine();
    engine.registerRule(timing);

    const result = engine.verify(observation({ responseTime: 250 }, 'perf'));

    expect(result.summary.passed).toBe(false);
    expect(result.evidencePath[0].severity).toBe('warning');
    expect(result.evidencePath[0].reasoning).toContain('exceeds');
  });

  it('defaults a missing response time to 0 and passes', () => {
    const engine = new VerificationEngine();
    engine.registerRule(timing);

    const result = engine.verify(observation({}, 'perf'));

    expect(result.evidencePath[0].value).toBe(0);
    expect(result.summary.passed).toBe(true);
  });
});

describe('VerificationEngine — unknown and empty rule sets', () => {
  it('passes an unregistered rule name at reduced confidence', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule({ name: 'entirely-novel-rule' }));

    const result = engine.verify(observation({ statusCode: 200 }));

    expect(result.summary.passed).toBe(true);
    expect(result.rules[0].confidence).toBeCloseTo(0.5);
    expect(result.evidencePath[0].condition).toBe('unknown-rule');
    expect(result.evidencePath[0].reasoning).toContain('assuming pass');
  });

  it('returns a passing result with no evidence when no rules apply', () => {
    const engine = new VerificationEngine();

    const result = engine.verify(observation({ statusCode: 200 }));

    expect(result.summary.rulesApplied).toBe(0);
    expect(result.summary.passed).toBe(true);
    expect(result.evidencePath).toEqual([]);
    expect(result.ruleVersions).toEqual({});
  });

  it('numbers evidence steps sequentially across multiple rules', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());
    engine.registerRule(rule({ name: 'response-time-threshold' }));

    const result = engine.verify(observation({ statusCode: 200, responseTime: 10 }));

    expect(result.summary.rulesApplied).toBe(2);
    expect(result.evidencePath.map((e) => e.step)).toEqual([1, 2]);
  });
});

describe('VerificationEngine — result cache', () => {
  it('returns the cached result for a repeated observation', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());
    const obs = observation({ statusCode: 200 });

    const first = engine.verify(obs);
    const second = engine.verify(obs);

    expect(second).toBe(first);
  });

  it('discards entries older than the TTL', () => {
    const engine = new VerificationEngine(-1);
    engine.registerRule(rule());
    const obs = observation({ statusCode: 200 });

    const first = engine.verify(obs);
    const second = engine.verify(obs);

    expect(second).not.toBe(first);
    expect(second.id).not.toBe(first.id);
  });

  it('clearCache forces re-verification', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());
    const obs = observation({ statusCode: 200 });

    const first = engine.verify(obs);
    engine.clearCache();
    const second = engine.verify(obs);

    expect(second.id).not.toBe(first.id);
    expect(second.summary).toEqual(first.summary);
  });

  it('caches per observation id, not globally', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());

    const passing = engine.verify(observation({ statusCode: 200 }));
    const failing = engine.verify(observation({ statusCode: 503 }));

    expect(passing.summary.passed).toBe(true);
    expect(failing.summary.passed).toBe(false);
  });
});
