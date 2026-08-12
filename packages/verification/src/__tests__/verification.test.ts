import { VerificationEngine } from '@omega-v/verification';
import { Observation, VerificationRule } from '@omega-v/types';

describe('VerificationEngine', () => {
  let engine: VerificationEngine;

  beforeEach(() => {
    engine = new VerificationEngine();
  });

  describe('Rule Registration', () => {
    it('should register a verification rule', () => {
      const rule: VerificationRule = {
        name: 'test-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Test rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule);
      expect(engine.getRuleCount()).toBe(1);
    });

    it('should handle multiple rule registrations', () => {
      const rule1: VerificationRule = {
        name: 'rule-1',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Rule 1',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const rule2: VerificationRule = {
        name: 'rule-2',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'responseTime < 100',
        description: 'Rule 2',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule1);
      engine.registerRule(rule2);
      expect(engine.getRuleCount()).toBe(2);
    });

    it('should support rule versioning', () => {
      const rule1: VerificationRule = {
        name: 'versioned-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Version 1',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const rule2: VerificationRule = {
        name: 'versioned-rule',
        version: '2.0.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Version 2',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule1);
      engine.registerRule(rule2);
      expect(engine.getRuleCount()).toBe(2);
    });
  });

  describe('Rule Application', () => {
    it('should find applicable rules for observation category', () => {
      const rule: VerificationRule = {
        name: 'health-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Health check rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule);

      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Service is healthy', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.95,
        confidenceReason: 'Healthy',
        status: 'normalized',
      };

      const applicable = engine.getApplicableRules(observation);
      expect(applicable.length).toBe(1);
      expect(applicable[0].name).toBe('health-rule');
    });

    it('should not apply rules for wrong category', () => {
      const rule: VerificationRule = {
        name: 'health-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Health check rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule);

      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Something else', category: 'other-category' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const applicable = engine.getApplicableRules(observation);
      expect(applicable.length).toBe(0);
    });

    it('should not apply inactive rules', () => {
      const rule: VerificationRule = {
        name: 'inactive-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Inactive rule',
        createdAt: new Date().toISOString(),
        active: false,
      };

      engine.registerRule(rule);

      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Service is healthy', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Healthy',
        status: 'normalized',
      };

      const applicable = engine.getApplicableRules(observation);
      expect(applicable.length).toBe(0);
    });
  });

  describe('Verification Execution', () => {
    beforeEach(() => {
      const responseTimeRule: VerificationRule = {
        name: 'response-time-threshold',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'responseTime < 100',
        description: 'Response time < 100ms',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const statusCodeRule: VerificationRule = {
        name: 'status-code-check',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Status code is 200',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(responseTimeRule);
      engine.registerRule(statusCodeRule);
    });

    it('should verify observation and produce result', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Service is healthy', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.95,
        confidenceReason: 'Healthy',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^ver-/);
      expect(result.observationId).toBe(observation.id);
      expect(result.summary.passed).toBe(true);
      expect(result.summary.rulesApplied).toBe(2);
    });

    it('should generate evidence path', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Service is healthy', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.95,
        confidenceReason: 'Healthy',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.evidencePath.length).toBeGreaterThan(0);
      expect(result.evidencePath[0].step).toBe(1);
      expect(result.evidencePath[0].rule).toBeDefined();
      expect(result.evidencePath[0].passed).toBeDefined();
      expect(result.evidencePath[0].reasoning).toBeDefined();
    });

    it('should fail verification when rule fails', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Service failed', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 500, responseTime: 150 },
        confidence: 0.5,
        confidenceReason: 'Failed',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.summary.passed).toBe(false);
      expect(result.summary.rulesFailed).toBeGreaterThan(0);
    });

    it('should include rule versions in result', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Service is healthy', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.95,
        confidenceReason: 'Healthy',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.ruleVersions).toBeDefined();
      expect(result.ruleVersions['response-time-threshold']).toBe('1.0.0');
      expect(result.ruleVersions['status-code-check']).toBe('1.0.0');
    });

    it('should report rule application counts accurately', () => {
      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Service is healthy', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200, responseTime: 50 },
        confidence: 0.95,
        confidenceReason: 'Healthy',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.summary.rulesApplied).toBe(2);
      expect(result.summary.rulesPassed).toBe(2);
      expect(result.summary.rulesFailed).toBe(0);
    });
  });

  describe('Caching', () => {
    it('should cache verification results', () => {
      const rule: VerificationRule = {
        name: 'test-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Test rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule);

      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200 },
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const result1 = engine.verify(observation);
      const result2 = engine.verify(observation);

      expect(result1.id).toBe(result2.id);
    });

    it('should clear cache', () => {
      const rule: VerificationRule = {
        name: 'test-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Test rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule);

      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200 },
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const result1 = engine.verify(observation);
      engine.clearCache();
      const result2 = engine.verify(observation);

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('Completion Status', () => {
    it('should mark verification as completed', () => {
      const rule: VerificationRule = {
        name: 'test-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'statusCode == 200',
        description: 'Test rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule);

      const observation: Observation = {
        id: 'obs-1',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200 },
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.status).toBe('completed');
    });
  });
});
