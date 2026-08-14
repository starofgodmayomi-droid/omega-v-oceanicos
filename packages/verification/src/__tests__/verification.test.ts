import { VerificationEngine } from '../index';
import { Observation, VerificationRule } from '@omega-v/types';

describe('VerificationEngine', () => {
  let engine: VerificationEngine;
  let testObservation: Observation;

  beforeEach(() => {
    engine = new VerificationEngine(60000);

    testObservation = {
      id: 'obs-test-1',
      claim: {
        statement: 'Service is healthy',
        category: 'health-check',
      },
      source: {
        system: 'test-system',
        version: '1.0.0',
        environment: 'test',
      },
      timestamp: new Date().toISOString(),
      observedBy: 'test',
      metadata: {
        responseTime: 42,
        statusCode: 200,
      },
      confidence: 0.95,
      confidenceReason: 'Test observation',
      status: 'normalized',
    };
  });

  describe('registerRule()', () => {
    it('registers a verification rule', () => {
      const rule: VerificationRule = {
        name: 'test-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'responseTime < 100',
        description: 'Test rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule);
      expect(engine.getRuleCount()).toBe(1);
    });

    it('tracks rule by name and version', () => {
      const rule1: VerificationRule = {
        name: 'same-name',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'test',
        description: 'Rule 1.0',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const rule2: VerificationRule = {
        name: 'same-name',
        version: '2.0.0',
        appliesTo: ['health-check'],
        definition: 'test',
        description: 'Rule 2.0',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule1);
      engine.registerRule(rule2);

      expect(engine.getRuleCount()).toBe(2);
    });
  });

  describe('getApplicableRules()', () => {
    it('returns rules that apply to observation category', () => {
      const healthCheckRule: VerificationRule = {
        name: 'health-check-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'test',
        description: 'Health check rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const otherRule: VerificationRule = {
        name: 'other-rule',
        version: '1.0.0',
        appliesTo: ['other-category'],
        definition: 'test',
        description: 'Other rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(healthCheckRule);
      engine.registerRule(otherRule);

      const applicable = engine.getApplicableRules(testObservation);
      expect(applicable).toHaveLength(1);
      expect(applicable[0].name).toBe('health-check-rule');
    });

    it('returns only active rules', () => {
      const activeRule: VerificationRule = {
        name: 'active-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'test',
        description: 'Active rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const inactiveRule: VerificationRule = {
        name: 'inactive-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'test',
        description: 'Inactive rule',
        createdAt: new Date().toISOString(),
        active: false,
      };

      engine.registerRule(activeRule);
      engine.registerRule(inactiveRule);

      const applicable = engine.getApplicableRules(testObservation);
      expect(applicable).toHaveLength(1);
      expect(applicable[0].name).toBe('active-rule');
    });

    it('returns empty array when no rules apply', () => {
      const otherRule: VerificationRule = {
        name: 'other-rule',
        version: '1.0.0',
        appliesTo: ['non-matching-category'],
        definition: 'test',
        description: 'Other rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(otherRule);

      const applicable = engine.getApplicableRules(testObservation);
      expect(applicable).toHaveLength(0);
    });
  });

  describe('verify()', () => {
    beforeEach(() => {
      const rule1: VerificationRule = {
        name: 'response-time-threshold',
        version: '1.0.5',
        appliesTo: ['health-check'],
        definition: 'responseTime < 100',
        description: 'Response time check',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const rule2: VerificationRule = {
        name: 'status-code-check',
        version: '1.2.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Status code check',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule1);
      engine.registerRule(rule2);
    });

    it('produces a verification result', () => {
      const result = engine.verify(testObservation);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.observationId).toBe(testObservation.id);
      expect(result.status).toBe('completed');
      expect(result.timestamp).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('includes all applicable rules in verification', () => {
      const result = engine.verify(testObservation);

      expect(result.summary.rulesApplied).toBe(2);
      expect(result.rules).toHaveLength(2);
      expect(result.rules.map((r) => r.name)).toContain('response-time-threshold');
      expect(result.rules.map((r) => r.name)).toContain('status-code-check');
    });

    it('generates evidence path for each rule', () => {
      const result = engine.verify(testObservation);

      expect(result.evidencePath).toBeDefined();
      expect(result.evidencePath.length).toBeGreaterThan(0);
      
      result.evidencePath.forEach((step) => {
        expect(step.step).toBeDefined();
        expect(step.rule).toBeDefined();
        expect(step.condition).toBeDefined();
        expect(step.passed).toBeDefined();
        expect(step.reasoning).toBeDefined();
      });
    });

    it('passes verification when all rules pass', () => {
      const goodObservation: Observation = {
        ...testObservation,
        metadata: {
          responseTime: 42,
          statusCode: 200,
        },
      };

      const result = engine.verify(goodObservation);

      expect(result.summary.passed).toBe(true);
      expect(result.summary.rulesPassed).toBe(2);
      expect(result.summary.rulesFailed).toBe(0);
    });

    it('fails verification when any rule fails', () => {
      const badObservation: Observation = {
        ...testObservation,
        metadata: {
          responseTime: 150,
          statusCode: 200,
        },
      };

      const result = engine.verify(badObservation);

      expect(result.summary.passed).toBe(false);
      expect(result.summary.rulesFailed).toBeGreaterThan(0);
    });

    it('tracks rule versions in verification result', () => {
      const result = engine.verify(testObservation);

      expect(result.ruleVersions['response-time-threshold']).toBe('1.0.5');
      expect(result.ruleVersions['status-code-check']).toBe('1.2.0');
    });

    it('caches verification results', () => {
      const result1 = engine.verify(testObservation);
      const result2 = engine.verify(testObservation);

      expect(result1.id).toBe(result2.id);
    });

    it('respects cache TTL', async () => {
      const shortCacheEngine = new VerificationEngine(100);

      const rule: VerificationRule = {
        name: 'test-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'test',
        description: 'Test',
        createdAt: new Date().toISOString(),
        active: true,
      };

      shortCacheEngine.registerRule(rule);

      const result1 = shortCacheEngine.verify(testObservation);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const result2 = shortCacheEngine.verify(testObservation);

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('clearCache()', () => {
    it('clears cached verification results', () => {
      const rule: VerificationRule = {
        name: 'test-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'test',
        description: 'Test',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule);

      const result1 = engine.verify(testObservation);
      engine.clearCache();
      const result2 = engine.verify(testObservation);

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('getRuleCount()', () => {
    it('returns the number of registered rules', () => {
      expect(engine.getRuleCount()).toBe(0);

      const rule1: VerificationRule = {
        name: 'rule-1',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'test',
        description: 'Rule 1',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule1);
      expect(engine.getRuleCount()).toBe(1);

      const rule2: VerificationRule = {
        name: 'rule-2',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'test',
        description: 'Rule 2',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule2);
      expect(engine.getRuleCount()).toBe(2);
    });
  });

  describe('rule execution', () => {
    it('correctly evaluates response-time-threshold rule', () => {
      const rule: VerificationRule = {
        name: 'response-time-threshold',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'responseTime < 100',
        description: 'Test',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule);

      const passObservation: Observation = {
        ...testObservation,
        metadata: { responseTime: 42 },
      };

      const passResult = engine.verify(passObservation);
      expect(passResult.summary.passed).toBe(true);

      const failObservation: Observation = {
        ...testObservation,
        metadata: { responseTime: 150 },
      };

      const failResult = engine.verify(failObservation);
      expect(failResult.summary.passed).toBe(false);
    });

    it('correctly evaluates status-code-check rule', () => {
      const rule: VerificationRule = {
        name: 'status-code-check',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Test',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule);

      const passObservation: Observation = {
        ...testObservation,
        metadata: { statusCode: 200 },
      };

      const passResult = engine.verify(passObservation);
      expect(passResult.summary.passed).toBe(true);

      const failObservation: Observation = {
        ...testObservation,
        metadata: { statusCode: 500 },
      };

      const failResult = engine.verify(failObservation);
      expect(failResult.summary.passed).toBe(false);
    });
  });
});
